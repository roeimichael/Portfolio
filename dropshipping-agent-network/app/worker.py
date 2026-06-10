"""The Orchestrator heartbeat. Drains events, advances every live order/ticket
state machine one step, and (in paper mode) advances the simulated world.

Stateless and idempotent: safe to stop/restart at any time."""
import time

from .config import S
from . import db, engine


def tick():
    # 1) intake events from the bus (webhooks / simulation)
    for ev in db.unprocessed_events():
        try:
            engine.handle_event(ev)
        finally:
            db.mark_event(ev["id"])

    # 2) advance active orders one deterministic step each
    active = db.query(
        "SELECT * FROM orders WHERE status NOT IN ('CLOSED','CANCELLED','HOLD') ORDER BY id"
    )
    for o in active:
        engine.advance_order(o)

    # 3) advance new tickets
    for t in db.query("SELECT * FROM tickets WHERE status='new' ORDER BY id"):
        engine.advance_ticket(t)


def run_forever():
    db.init_db()
    print(f"[worker] running in {S.MODE.upper()} mode. "
          f"caps: per_order=${S.PER_ORDER_CAP} daily=${S.DAILY_CAP} "
          f"refund=${S.REFUND_CEILING} | LLM={'on' if S.USE_LLM else 'off'}", flush=True)
    while True:
        try:
            tick()
        except Exception as e:  # never let the heartbeat die
            print(f"[worker] tick error: {e}", flush=True)
        time.sleep(S.TICK_SEC)
