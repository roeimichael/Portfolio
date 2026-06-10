"""Core safety + state-machine tests. Run: python -m tests.test_core
Uses a throwaway DB so it never touches your real data."""
import os
import tempfile

# point the system at a temp DB BEFORE importing app modules
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["MODE"] = "paper"
os.environ["USE_LLM"] = "false"
os.environ["PER_ORDER_CAP"] = "40"
os.environ["DAILY_CAP"] = "200"
os.environ["REFUND_CEILING"] = "25"

from app import db, guardrail, engine, worker  # noqa: E402

PASS = 0
FAIL = 0


def check(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}")


def fresh():
    db.reset()
    if os.path.exists(os.environ["DB_PATH"]):
        os.remove(os.environ["DB_PATH"])
    db.init_db()


def order(store, price, cost, outcome="deliver", ship_ok=True):
    db.publish_event("order.created", {
        "store_order_id": store, "customer_email": f"{store}@x.com",
        "ship_to": {"address1": "1 St" if ship_ok else "", "country": "US" if ship_ok else "",
                    "name": "T", "city": "A", "zip": "1"},
        "sim_outcome": outcome,
        "items": [{"sku": store, "price": price, "cost": cost, "qty": 1}],
    })


def get(store):
    return db.query_one("SELECT * FROM orders WHERE store_order_id=?", (store,))


def run_ticks(n):
    for _ in range(n):
        worker.tick()


print("test: guardrail hard caps")
fresh()
r = guardrail.submit_intent({"idem_key": "k1", "type": "supplier_order", "amount": 999,
                             "related_type": "order", "related_id": 1})
check("over per-order cap escalates, does not execute", r["status"] == "escalated")

print("test: idempotency (no double-spend)")
fresh()
db.execute("INSERT INTO orders(store_order_id,items,sale_total,supplier_cost,status,created_at,updated_at)"
           " VALUES('z',?,30,10,'READY',?,?)", ('[{"sku":"z","price":30,"cost":10,"qty":1}]', db.now(), db.now()))
a = guardrail.submit_intent({"idem_key": "dup", "type": "supplier_order", "amount": 10,
                             "related_type": "order", "related_id": 1})
b = guardrail.submit_intent({"idem_key": "dup", "type": "supplier_order", "amount": 10,
                             "related_type": "order", "related_id": 1})
check("first executes", a["status"] == "executed")
check("duplicate is deduped, not re-charged", b["status"] == "deduped")

print("test: wallet is a hard ceiling on money-out")
fresh()
db.set_state("wallet_balance", 5)
db.execute("INSERT INTO orders(store_order_id,items,sale_total,supplier_cost,status,created_at,updated_at)"
           " VALUES('w',?,30,10,'READY',?,?)", ('[{"sku":"w","price":30,"cost":10,"qty":1}]', db.now(), db.now()))
r = guardrail.submit_intent({"idem_key": "wk", "type": "supplier_order", "amount": 10,
                             "related_type": "order", "related_id": 1})
check("insufficient wallet escalates instead of overspending", r["status"] == "escalated")

print("test: happy-path order reaches CLOSED autonomously")
fresh()
order("100", 29.99, 8.50)
run_ticks(12)
check("happy order closed", get("100")["status"] == "CLOSED")

print("test: order over per-order cap goes to HOLD (human)")
fresh()
order("200", 89.0, 52.0)
run_ticks(3)
o = get("200")
check("expensive order held for approval", o["status"] == "HOLD")
esc = db.query_one("SELECT * FROM escalations WHERE related_id=? AND status='open'", (o["id"],))
check("a human escalation was created", esc is not None and esc["tier"] == "human")

print("test: approving the escalation ships it")
engine.resolve_escalation(esc["id"], {"verdict": "approve"})
run_ticks(12)
check("approved order now closed", get("200")["status"] == "CLOSED")

print("test: shipment exception auto-resolves within policy (reship)")
fresh()
order("300", 24.0, 7.0, outcome="exception")
run_ticks(16)
check("exception order resolved to CLOSED autonomously", get("300")["status"] == "CLOSED")

print("test: bad address escalates to a human, never ships")
fresh()
order("400", 19.99, 6.0, ship_ok=False)
run_ticks(4)
check("bad address held", get("400")["status"] == "HOLD")

print("test: approving a non-spend hold resumes the order (does not cancel)")
e = db.query_one("SELECT * FROM escalations WHERE related_id=? AND status='open'", (get("400")["id"],))
engine.resolve_escalation(e["id"], {"verdict": "approve"})
run_ticks(12)
check("approved address order ships and closes", get("400")["status"] == "CLOSED")

print("test: denying a spend hold cancels and refunds the customer")
fresh()
order("500", 89.0, 52.0)
run_ticks(3)
e = db.query_one("SELECT * FROM escalations WHERE related_id=? AND status='open'", (get("500")["id"],))
engine.resolve_escalation(e["id"], {"verdict": "deny"})
run_ticks(2)
check("denied order cancelled", get("500")["status"] == "CANCELLED")
ref = db.query_one("SELECT * FROM ledger WHERE order_id=? AND type='refund'", (get("500")["id"],))
check("customer refunded on cancel", ref is not None)

print("test: chargeback ticket escalates to a human")
fresh()
db.publish_event("ticket.created", {"order_id": None, "customer_email": "e@x.com",
                                    "subject": "dispute", "body": "filing a chargeback with my bank"})
run_ticks(2)
t = db.query_one("SELECT * FROM tickets WHERE customer_email='e@x.com'")
check("chargeback ticket escalated", t["status"] == "escalated")

print("test: tracking question is answered autonomously")
fresh()
db.publish_event("ticket.created", {"order_id": None, "customer_email": "q@x.com",
                                    "subject": "where", "body": "where is my order, when will it arrive?"})
run_ticks(2)
t = db.query_one("SELECT * FROM tickets WHERE customer_email='q@x.com'")
check("tracking question resolved", t["status"] == "resolved")

print(f"\n{PASS} passed, {FAIL} failed")
raise SystemExit(1 if FAIL else 0)
