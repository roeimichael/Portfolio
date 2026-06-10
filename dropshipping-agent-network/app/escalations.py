"""Escalations + notifications. Silence is success: a record here is the only
way the business reaches a human. Resolution logic lives in engine.py to avoid
an import cycle (engine imports this; this stays dependency-light)."""
import json

from . import db


def notify(level, message):
    db.execute(
        "INSERT INTO notifications(level,message,created_at,seen) VALUES(?,?,?,0)",
        (level, message, db.now()),
    )
    tag = {"human": "🔴 NEEDS YOU", "supervisor": "🟡 supervisor", "info": "·"}.get(level, level)
    print(f"[notify] {tag}: {message}", flush=True)


def create(tier, kind, summary, context, recommended, related_type, related_id):
    eid = db.execute(
        "INSERT INTO escalations(tier,kind,summary,context,recommended,related_type,"
        "related_id,status,created_at) VALUES(?,?,?,?,?,?,?, 'open', ?)",
        (tier, kind, summary, json.dumps(context), json.dumps(recommended),
         related_type, related_id, db.now()),
    )
    notify(tier, f"#{eid} [{kind}] {summary}  — recommended: {recommended.get('action','review')}")
    return eid


def open_escalations():
    return db.query("SELECT * FROM escalations WHERE status='open' ORDER BY id")


def get(eid):
    return db.query_one("SELECT * FROM escalations WHERE id=?", (eid,))


def mark_resolved(eid, decision):
    db.execute(
        "UPDATE escalations SET status='resolved', decision=?, resolved_at=? WHERE id=?",
        (json.dumps(decision), db.now(), eid),
    )
