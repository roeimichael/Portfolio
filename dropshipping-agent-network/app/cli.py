"""Command line entry point.

  python -m app.cli initdb       create the database
  python -m app.cli run          start worker + dashboard (the live system)
  python -m app.cli simulate     inject a realistic batch of orders/tickets (paper)
  python -m app.cli status       print a text status snapshot
  python -m app.cli escalations  list open escalations
  python -m app.cli approve <id> [deny]   resolve an escalation
"""
import sys
import json
import threading

from .config import S
from . import db, engine, server, worker, adapters


def cmd_initdb():
    db.init_db()
    print(f"initialized {S.DB_PATH}")


def cmd_run():
    db.init_db()
    threading.Thread(target=server.serve, daemon=True).start()
    worker.run_forever()


def cmd_simulate():
    db.init_db()
    seed = [
        # store#, email, items[(price,cost,qty)], outcome, ship_ok
        ("1001", "amy@example.com", [(29.99, 8.50, 1)], "deliver", True),     # happy path
        ("1002", "ben@example.com", [(89.00, 52.00, 1)], "deliver", True),    # cost > per_order_cap -> human approve
        ("1003", "cat@example.com", [(24.00, 7.00, 1)], "exception", True),   # exception -> auto reship
        ("1004", "dan@example.com", [(19.99, 6.00, 1)], "deliver", False),    # bad address -> human review
    ]
    for store, email, items, outcome, ship_ok in seed:
        ship = {"address1": "1 Main St" if ship_ok else "", "country": "US" if ship_ok else "",
                "name": email.split("@")[0].title(), "city": "Austin", "zip": "78701"}
        db.publish_event("order.created", {
            "store_order_id": store, "customer_email": email, "ship_to": ship,
            "sim_outcome": outcome,
            "items": [{"sku": f"SKU-{store}", "price": p, "cost": c, "qty": q}
                      for (p, c, q) in items],
        })
    # a couple of customer messages
    db.publish_event("ticket.created", {"order_id": None, "customer_email": "amy@example.com",
                                        "subject": "Where is my order?", "body": "Hi, where is my order? when will it arrive?"})
    db.publish_event("ticket.created", {"order_id": None, "customer_email": "eve@example.com",
                                        "subject": "Dispute", "body": "I'm filing a chargeback dispute with my bank!"})
    print("simulation seeded: 4 orders + 2 tickets queued on the bus.")
    print("now run:  python -m app.cli run     (watch the dashboard, approve escalations)")


def cmd_status():
    db.init_db()
    rev = db.query_one("SELECT COALESCE(SUM(amount),0) s FROM ledger WHERE type='revenue'")["s"]
    spend = db.query_one("SELECT COALESCE(SUM(amount),0) s FROM ledger WHERE type IN ('cost','refund')")["s"]
    print(f"mode={S.MODE}  kill_switch={db.get_state('kill_switch')}  wallet=${adapters.wallet_balance():.2f}")
    print(f"P&L=${rev-spend:.2f}  (rev ${rev:.2f} / spend ${spend:.2f})")
    print("orders:")
    for o in db.query("SELECT store_order_id,status,tracking_status,sale_total,supplier_cost FROM orders ORDER BY id"):
        print(f"  {o['store_order_id']:>6}  {o['status']:<12} {o['tracking_status'] or '':<12} "
              f"sale=${o['sale_total']:.2f} cost=${o['supplier_cost']:.2f}")
    op = db.query("SELECT id,tier,kind,summary FROM escalations WHERE status='open'")
    print(f"open escalations: {len(op)}")
    for e in op:
        print(f"  #{e['id']} [{e['tier']}/{e['kind']}] {e['summary']}")


def cmd_escalations():
    db.init_db()
    for e in db.query("SELECT * FROM escalations WHERE status='open' ORDER BY id"):
        rec = json.loads(e["recommended"] or "{}")
        print(f"#{e['id']} [{e['tier']}/{e['kind']}] {e['summary']}  rec={rec.get('action')}")
    print("approve with:  python -m app.cli approve <id> [deny]")


def cmd_approve(args):
    db.init_db()
    if not args:
        print("usage: approve <id> [deny|approve] [--action refund]")
        return
    eid = int(args[0])
    verdict = "deny" if (len(args) > 1 and args[1] == "deny") else "approve"
    decision = {"verdict": verdict}
    if "--action" in args:
        decision["action"] = args[args.index("--action") + 1]
    print(engine.resolve_escalation(eid, decision))


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    rest = sys.argv[2:]
    {
        "initdb": cmd_initdb, "run": cmd_run, "simulate": cmd_simulate,
        "status": cmd_status, "escalations": cmd_escalations,
    }.get(cmd, lambda: cmd_approve(rest) if cmd == "approve" else print(__doc__))()


if __name__ == "__main__":
    main()
