"""The Guardrail — deterministic code that physically holds the money rails.

Agents/engine emit *intents*; this decides: execute now, or escalate. It cannot
be prompt-injected because it is not an LLM. Hard caps, idempotency, kill switch,
and the bounded wallet all live here.

Decision shape returned: {status, intent_id, reason, result}
  status in: executed | escalated | denied | deduped
"""
import json

from .config import S
from . import db, adapters

SPEND_TYPES = {"supplier_order", "reship"}


def _today_spend():
    r = db.query_one(
        "SELECT COALESCE(SUM(amount),0) s FROM ledger "
        "WHERE type IN ('cost','refund') AND substr(created_at,1,10)=?",
        (db.today(),),
    )
    return float(r["s"])


def _persist(intent, status, reason=None):
    iid = db.execute(
        "INSERT INTO intents(idem_key,type,amount,payload,related_type,related_id,"
        "status,decision_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        (
            intent["idem_key"], intent["type"], float(intent.get("amount", 0) or 0),
            json.dumps(intent.get("payload", {})), intent.get("related_type"),
            intent.get("related_id"), status, reason, db.now(),
        ),
    )
    return iid


def submit_intent(intent):
    """Validate against hard rules, then execute or escalate."""
    # idempotency: never double-act
    existing = db.query_one("SELECT * FROM intents WHERE idem_key=?", (intent["idem_key"],))
    if existing and existing["status"] in ("executed", "approved"):
        return {
            "status": "deduped", "intent_id": existing["id"],
            "result": json.loads(existing["result"] or "{}"),
        }

    t = intent["type"]
    amt = float(intent.get("amount", 0) or 0)

    # kill switch: nothing with side-effects executes (messages still allowed)
    if db.get_state("kill_switch") == "on" and t != "customer_message":
        iid = _persist(intent, "escalated", "kill_switch_on")
        return {"status": "escalated", "intent_id": iid, "reason": "kill_switch_on"}

    # hard caps (un-arguable)
    if t in SPEND_TYPES:
        if amt > S.PER_ORDER_CAP:
            iid = _persist(intent, "escalated", "over_per_order_cap")
            return {"status": "escalated", "intent_id": iid, "reason": "over_per_order_cap"}
        if _today_spend() + amt > S.DAILY_CAP:
            iid = _persist(intent, "escalated", "over_daily_cap")
            return {"status": "escalated", "intent_id": iid, "reason": "over_daily_cap"}
    elif t == "refund":
        if amt > S.REFUND_CEILING:
            iid = _persist(intent, "escalated", "over_refund_ceiling")
            return {"status": "escalated", "intent_id": iid, "reason": "over_refund_ceiling"}

    iid = _persist(intent, "pending")
    return _execute(iid)


def force_execute(intent_id):
    """Bypass caps — used only after a human/supervisor approves an escalation."""
    return _execute(intent_id, forced=True)


def execute_forced(intent):
    """Persist + execute an intent bypassing caps. For human-authorized actions
    (e.g. a full refund when a human cancels an order above the auto ceiling)."""
    existing = db.query_one("SELECT * FROM intents WHERE idem_key=?", (intent["idem_key"],))
    if existing and existing["status"] in ("executed", "approved"):
        return {"status": "deduped", "intent_id": existing["id"],
                "result": json.loads(existing["result"] or "{}")}
    iid = _persist(intent, "pending", "human_authorized")
    return _execute(iid, forced=True)


def _execute(intent_id, forced=False):
    row = db.query_one("SELECT * FROM intents WHERE id=?", (intent_id,))
    if row is None:
        return {"status": "denied", "reason": "no_intent"}
    if row["status"] == "executed":
        return {"status": "deduped", "intent_id": intent_id,
                "result": json.loads(row["result"] or "{}")}
    t = row["type"]
    payload = json.loads(row["payload"] or "{}")
    amt = float(row["amount"] or 0)
    result = {}

    if t in SPEND_TYPES:
        order = db.query_one("SELECT * FROM orders WHERE id=?", (row["related_id"],))
        items = json.loads(order["items"])
        res = adapters.supplier_place_order(dict(order), items)
        if not res.get("ok"):
            db.execute("UPDATE intents SET status='escalated', decision_reason=? WHERE id=?",
                       (res.get("reason", "supplier_fail"), intent_id))
            return {"status": "escalated", "intent_id": intent_id,
                    "reason": res.get("reason", "supplier_fail")}
        charge = adapters.wallet_charge(res["cost"], order["store_order_id"])
        if not charge.get("ok"):
            db.execute("UPDATE intents SET status='escalated', decision_reason='insufficient_wallet' WHERE id=?",
                       (intent_id,))
            return {"status": "escalated", "intent_id": intent_id, "reason": "insufficient_wallet"}
        _ledger(order["id"], "cost", res["cost"], f"{t} {res['supplier_order_id']}")
        result = res

    elif t == "refund":
        order = db.query_one("SELECT * FROM orders WHERE id=?", (row["related_id"],))
        adapters.shopify_refund(dict(order) if order else {}, amt)
        adapters.wallet_topup(0)  # refunds are paid from revenue, not the wallet
        _ledger(row["related_id"], "refund", amt, payload.get("note", "refund"))
        if order:
            adapters.send_email(order["customer_email"], "Your refund",
                                 f"We've refunded ${amt:.2f} for order {order['store_order_id']}.")
        result = {"refunded": amt}

    elif t == "customer_message":
        adapters.send_email(payload["to"], payload["subject"], payload["body"])
        result = {"sent": True}

    elif t == "publish_listing":
        listing = db.query_one("SELECT * FROM listings WHERE id=?", (row["related_id"],))
        res = adapters.shopify_publish(dict(listing))
        if res.get("ok"):
            db.execute("UPDATE listings SET status='published', store_listing_id=? WHERE id=?",
                       (res["store_listing_id"], row["related_id"]))
        result = res

    db.execute("UPDATE intents SET status='executed', result=?, executed_at=? WHERE id=?",
               (json.dumps(result), db.now(), intent_id))
    return {"status": "executed", "intent_id": intent_id, "result": result}


def _ledger(order_id, typ, amount, note):
    db.execute("INSERT INTO ledger(order_id,type,amount,note,created_at) VALUES(?,?,?,?,?)",
               (order_id, typ, amount, note, db.now()))


# ---- circuit breaker ----
def record_failure(capability):
    db.execute("INSERT INTO breaker_events(capability,created_at) VALUES(?,?)",
               (capability, db.now()))


def breaker_tripped(capability):
    r = db.query_one(
        "SELECT COUNT(*) c FROM breaker_events WHERE capability=? "
        "AND created_at >= datetime('now', ?)",
        (capability, f"-{S.BREAKER_WINDOW_SEC} seconds"),
    )
    return r["c"] >= S.BREAKER_THRESHOLD
