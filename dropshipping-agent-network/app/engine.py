"""The deterministic workflow engine. Owns the lifecycle of every order and
ticket as a state machine. Transitions are code; the LLM is consulted only at
named joints and only chooses from a fixed menu. This is what makes the system
autonomous *without uncertainty*.

Order states:
  NEW -> READY -> PLACED -> IN_TRANSIT -> DELIVERED -> SETTLED -> CLOSED
  branches: EXCEPTION, HOLD (awaiting escalation), CANCELLED
"""
import json

from .config import S
from . import db, guardrail, brains, escalations, adapters

TERMINAL = {"CLOSED", "CANCELLED"}


# ---------------------------------------------------------------------------
# Event intake (webhooks / simulation drop events on the bus)
# ---------------------------------------------------------------------------
def handle_event(ev):
    typ = ev["type"]
    p = json.loads(ev["payload"])
    if typ == "order.created":
        _create_order(p)
    elif typ == "ticket.created":
        _create_ticket(p)
    elif typ == "tracking.update":
        o = db.query_one("SELECT * FROM orders WHERE tracking_number=?", (p.get("tracking_number"),))
        if o:
            db.execute("UPDATE orders SET tracking_status=? WHERE id=?", (p.get("status"), o["id"]))
            if p.get("status") == "exception":
                _set(o["id"], status="EXCEPTION")


def _create_order(p):
    if db.query_one("SELECT 1 FROM orders WHERE store_order_id=?", (p["store_order_id"],)):
        return  # idempotent intake
    items = p["items"]
    sale = round(sum(float(i["price"]) * int(i.get("qty", 1)) for i in items), 2)
    cost = round(sum(float(i["cost"]) * int(i.get("qty", 1)) for i in items), 2)
    oid = db.execute(
        "INSERT INTO orders(store_order_id,customer_email,ship_to,items,sale_total,"
        "supplier_cost,status,sim_outcome,created_at,updated_at) "
        "VALUES(?,?,?,?,?,?, 'NEW', ?, ?, ?)",
        (p["store_order_id"], p["customer_email"], json.dumps(p["ship_to"]),
         json.dumps(items), sale, cost, p.get("sim_outcome", "deliver"),
         db.now(), db.now()),
    )
    guardrail._ledger(oid, "revenue", sale, "sale")  # recognize revenue at sale


def _create_ticket(p):
    db.execute(
        "INSERT INTO tickets(order_id,customer_email,channel,subject,body,status,created_at) "
        "VALUES(?,?,?,?,?, 'new', ?)",
        (p.get("order_id"), p["customer_email"], p.get("channel", "email"),
         p.get("subject", ""), p.get("body", ""), db.now()),
    )


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _set(oid, **fields):
    fields["updated_at"] = db.now()
    cols = ",".join(f"{k}=?" for k in fields)
    db.execute(f"UPDATE orders SET {cols} WHERE id=?", (*fields.values(), oid))


def _post_place(o, result):
    """After a supplier order succeeds: record ids, go in-transit, notify."""
    adapters.aftership_register(result["tracking_number"])
    _set(o["id"], status="IN_TRANSIT", supplier_order_id=result["supplier_order_id"],
         tracking_number=result["tracking_number"], tracking_status="in_transit",
         stage_ticks=0, hold_reason=None, pending_intent=None)
    adapters.send_email(o["customer_email"], "Your order has shipped 📦",
                        f"Order {o['store_order_id']} is on its way. "
                        f"Tracking: {result['tracking_number']}")


# ---------------------------------------------------------------------------
# Order state machine
# ---------------------------------------------------------------------------
def advance_order(o):
    st = o["status"]
    if st in TERMINAL or st == "HOLD":
        return

    if st == "NEW":
        d = brains.decide("validate_order", {
            "ship_to": json.loads(o["ship_to"]),
            "total_qty": sum(int(i.get("qty", 1)) for i in json.loads(o["items"])),
        }, ["proceed", "escalate"])
        if d["choice"] == "proceed":
            _set(o["id"], status="READY")
        else:
            _hold(o, "human", "address_or_fraud",
                  f"Order {o['store_order_id']} flagged: {d['rationale']}",
                  {"action": "review_then_approve_or_cancel"})

    elif st == "READY":
        d = brains.decide("order_router", {
            "supplier_cost": o["supplier_cost"], "supplier": S.SUPPLIER,
        }, ["route", "escalate"])
        if d["choice"] != "route":
            _hold(o, "human", "routing", f"Cannot auto-route {o['store_order_id']}: {d['rationale']}",
                  {"action": "review"})
            return
        res = guardrail.submit_intent({
            "idem_key": f"order:{o['id']}:place",
            "type": "supplier_order", "amount": o["supplier_cost"],
            "related_type": "order", "related_id": o["id"],
            "payload": {"supplier": S.SUPPLIER},
        })
        if res["status"] in ("executed", "deduped"):
            _post_place(o, res["result"])
        else:
            _hold(o, "human", "spend_approval",
                  f"Order {o['store_order_id']} needs spend approval "
                  f"(${o['supplier_cost']:.2f}, reason: {res.get('reason')})",
                  {"action": "approve_spend_or_cancel"}, pending_intent=res["intent_id"])

    elif st == "IN_TRANSIT":
        _world_progress(o)  # paper-mode carrier simulation / live: webhook-driven

    elif st == "EXCEPTION":
        _handle_exception(o)

    elif st == "DELIVERED":
        if not o["next_check_at"]:
            _set(o["id"], next_check_at=db.now())  # return window timer (short in paper)
        else:
            _set(o["id"], status="SETTLED")

    elif st == "SETTLED":
        margin = _margin(o["id"])
        escalations.notify("info", f"Order {o['store_order_id']} settled. margin=${margin:.2f}")
        _set(o["id"], status="CLOSED")


def _world_progress(o):
    """Paper-mode only: advance the carrier. Live mode is driven by webhooks."""
    if S.MODE != "paper":
        return
    ticks = o["stage_ticks"] + 1
    if o["sim_outcome"] == "exception" and ticks >= S.SIM_STAGE_TICKS:
        _set(o["id"], status="EXCEPTION", tracking_status="exception", stage_ticks=0)
    elif ticks >= S.SIM_STAGE_TICKS:
        _set(o["id"], status="DELIVERED", tracking_status="delivered", stage_ticks=0)
        adapters.send_email(o["customer_email"], "Delivered ✅",
                            f"Order {o['store_order_id']} was delivered. Enjoy!")
    else:
        _set(o["id"], stage_ticks=ticks)


def _handle_exception(o):
    d = brains.decide("exception", {
        "supplier_cost": o["supplier_cost"], "sale_total": o["sale_total"],
        "attempts": o["attempts"], "tracking_status": o["tracking_status"],
    }, ["reship", "refund", "contact_supplier", "escalate"])

    if d["choice"] == "reship":
        res = guardrail.submit_intent({
            "idem_key": f"order:{o['id']}:reship:{o['attempts']}",
            "type": "reship", "amount": o["supplier_cost"],
            "related_type": "order", "related_id": o["id"], "payload": {},
        })
        if res["status"] in ("executed", "deduped"):
            _set(o["id"], attempts=o["attempts"] + 1, sim_outcome="deliver")
            _post_place(o, res["result"])
            escalations.notify("info", f"Order {o['store_order_id']} exception auto-resolved (reship).")
        else:
            _hold(o, "supervisor" if o["supplier_cost"] <= S.SUPERVISOR_AUTHORITY else "human",
                  "exception_spend", f"Reship for {o['store_order_id']} needs approval ({res.get('reason')})",
                  {"action": "approve_reship_or_refund"}, pending_intent=res["intent_id"])

    elif d["choice"] == "refund":
        _refund_and_close(o, min(o["sale_total"], S.REFUND_CEILING), "exception_refund")

    elif d["choice"] == "contact_supplier":
        adapters.supplier_message(o["supplier_order_id"], "Shipment exception, please advise.")
        _set(o["id"], attempts=o["attempts"] + 1)
        if o["attempts"] + 1 >= 2:
            _hold(o, "human", "exception_unresolved",
                  f"Order {o['store_order_id']} exception unresolved after supplier contact",
                  {"action": "decide_reship_or_refund"})
    else:
        _hold(o, "human" if o["sale_total"] > S.SUPERVISOR_AUTHORITY else "supervisor",
              "exception", f"Shipment exception on {o['store_order_id']} needs a decision",
              {"action": "decide_reship_or_refund"})


def _refund_and_close(o, amount, note):
    res = guardrail.submit_intent({
        "idem_key": f"order:{o['id']}:refund",
        "type": "refund", "amount": amount,
        "related_type": "order", "related_id": o["id"], "payload": {"note": note},
    })
    if res["status"] in ("executed", "deduped"):
        _set(o["id"], status="CLOSED")
        escalations.notify("info", f"Order {o['store_order_id']} refunded ${amount:.2f} and closed.")
    else:
        _hold(o, "human", "refund_approval",
              f"Refund ${amount:.2f} on {o['store_order_id']} needs approval ({res.get('reason')})",
              {"action": "approve_refund"}, pending_intent=res["intent_id"])


def _hold(o, tier, kind, summary, recommended, pending_intent=None):
    _set(o["id"], status="HOLD", hold_reason=kind, pending_intent=pending_intent)
    escalations.create(tier, kind, summary,
                       {"order": o["store_order_id"], "sale_total": o["sale_total"],
                        "supplier_cost": o["supplier_cost"]},
                       recommended, "order", o["id"])


def _margin(oid):
    r = db.query_one(
        "SELECT COALESCE(SUM(CASE WHEN type='revenue' THEN amount ELSE -amount END),0) m "
        "FROM ledger WHERE order_id=?", (oid,))
    return float(r["m"])


# ---------------------------------------------------------------------------
# Ticket state machine
# ---------------------------------------------------------------------------
def advance_ticket(t):
    if t["status"] != "new":
        return
    order = db.query_one("SELECT * FROM orders WHERE id=?", (t["order_id"],)) if t["order_id"] else None
    d = brains.decide("customer_service", {
        "body": t["body"], "subject": t["subject"],
        "sale_total": order["sale_total"] if order else 0,
    }, ["reply", "refund", "cancel", "escalate"])

    if d["choice"] == "reply":
        body = _reply_body(d["params"].get("template"), order)
        guardrail.submit_intent({
            "idem_key": f"ticket:{t['id']}:reply", "type": "customer_message",
            "related_type": "ticket", "related_id": t["id"],
            "payload": {"to": t["customer_email"], "subject": "Re: " + (t["subject"] or "your order"),
                        "body": body},
        })
        _resolve_ticket(t, {"action": "replied"})

    elif d["choice"] == "refund" and order:
        amt = min(order["sale_total"], S.REFUND_CEILING)
        res = guardrail.submit_intent({
            "idem_key": f"ticket:{t['id']}:refund", "type": "refund", "amount": amt,
            "related_type": "ticket", "related_id": t["id"], "payload": {"note": "cs_refund"},
        })
        if res["status"] in ("executed", "deduped"):
            _resolve_ticket(t, {"action": "refunded", "amount": amt})
        else:
            _escalate_ticket(t, order, "refund_approval", res.get("reason"))

    elif d["choice"] == "cancel" and order and order["status"] in ("NEW", "READY"):
        _set(order["id"], status="CANCELLED")
        _refund_and_close(order, order["sale_total"], "cancel") if order["status"] != "CANCELLED" else None
        _resolve_ticket(t, {"action": "cancelled"})

    else:
        _escalate_ticket(t, order, "cs_escalate", d["rationale"])


def _reply_body(template, order):
    if template == "tracking" and order and order["tracking_number"]:
        return (f"Your order {order['store_order_id']} is on the way. "
                f"Tracking number: {order['tracking_number']}. Status: {order['tracking_status']}.")
    if template == "tracking" and order:
        return (f"Thanks for reaching out about {order['store_order_id']}. It's being prepared "
                f"and you'll get a tracking number shortly.")
    return "Thanks for your message — we're on it and will follow up shortly."


def _resolve_ticket(t, resolution):
    db.execute("UPDATE tickets SET status='resolved', resolution=? WHERE id=?",
               (json.dumps(resolution), t["id"]))


def _escalate_ticket(t, order, kind, reason):
    db.execute("UPDATE tickets SET status='escalated' WHERE id=?", (t["id"],))
    escalations.create("human", kind, f"Customer message needs a human: {reason}",
                       {"from": t["customer_email"], "subject": t["subject"], "body": t["body"][:200]},
                       {"action": "read_and_reply"}, "ticket", t["id"])


# ---------------------------------------------------------------------------
# Escalation resolution (called by CLI / dashboard when a human decides)
# ---------------------------------------------------------------------------
def resolve_escalation(eid, decision):
    """decision: {'verdict': 'approve'|'deny', 'action': optional, 'note': optional}"""
    esc = escalations.get(eid)
    if not esc or esc["status"] != "open":
        return {"ok": False, "reason": "not_open"}
    verdict = decision.get("verdict", "deny")

    if esc["related_type"] == "order":
        o = db.query_one("SELECT * FROM orders WHERE id=?", (esc["related_id"],))
        if verdict == "approve":
            if o["pending_intent"]:
                # a held spend/reship intent: execute it with caps bypassed
                res = guardrail.force_execute(o["pending_intent"])
                if res["status"] in ("executed", "deduped"):
                    _post_place(o, res["result"])
                    escalations.mark_resolved(eid, decision)
                    return {"ok": True, "result": "executed_and_shipping"}
                escalations.mark_resolved(eid, {**decision, "note": "execute_failed", "detail": res})
                _set(o["id"], status="HOLD")
                return {"ok": False, "reason": res.get("reason")}
            if decision.get("action") == "refund":
                _set(o["id"], status="EXCEPTION", pending_intent=None)
                _refund_and_close(db.query_one("SELECT * FROM orders WHERE id=?", (o["id"],)),
                                  min(o["sale_total"], S.REFUND_CEILING), "approved_refund")
                escalations.mark_resolved(eid, decision)
                return {"ok": True, "result": "refunded"}
            # no held intent (e.g. address/routing review): human approved -> resume flow
            _set(o["id"], status="READY", hold_reason=None, pending_intent=None)
            escalations.mark_resolved(eid, decision)
            return {"ok": True, "result": "resumed"}
        # deny -> cancel + make the customer whole (human-authorized: bypass ceiling)
        _set(o["id"], status="CANCELLED", pending_intent=None)
        guardrail.execute_forced({
            "idem_key": f"order:{o['id']}:refund", "type": "refund", "amount": o["sale_total"],
            "related_type": "order", "related_id": o["id"], "payload": {"note": "cancelled_by_human"},
        })
        escalations.mark_resolved(eid, decision)
        return {"ok": True, "result": "cancelled_and_refunded"}

    if esc["related_type"] == "ticket":
        t = db.query_one("SELECT * FROM tickets WHERE id=?", (esc["related_id"],))
        msg = decision.get("note", "Thanks for your patience — this has been handled by our team.")
        guardrail.submit_intent({
            "idem_key": f"ticket:{t['id']}:human_reply", "type": "customer_message",
            "related_type": "ticket", "related_id": t["id"],
            "payload": {"to": t["customer_email"], "subject": "Re: " + (t["subject"] or ""), "body": msg},
        })
        db.execute("UPDATE tickets SET status='resolved' WHERE id=?", (t["id"],))
        escalations.mark_resolved(eid, decision)
        return {"ok": True}

    escalations.mark_resolved(eid, decision)
    return {"ok": True}
