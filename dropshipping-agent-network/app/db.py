"""SQLite-backed state + a durable event log. Single source of truth.

Pure stdlib so it runs anywhere with python3. Thread-safe via a global lock
(the worker and the HTTP server run in separate threads).
"""
import sqlite3
import threading
import json
import datetime

from .config import S

_conn = None
_LOCK = threading.RLock()


def conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(S.DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
    return _conn


def reset():
    """For tests: drop the cached connection so a new DB_PATH takes effect."""
    global _conn
    if _conn is not None:
        _conn.close()
    _conn = None


def now():
    return datetime.datetime.utcnow().isoformat(timespec="seconds")


def today():
    return datetime.date.today().isoformat()


def query(sql, p=()):
    with _LOCK:
        return conn().execute(sql, p).fetchall()


def query_one(sql, p=()):
    with _LOCK:
        return conn().execute(sql, p).fetchone()


def execute(sql, p=()):
    with _LOCK:
        c = conn().execute(sql, p)
        conn().commit()
        return c.lastrowid


SCHEMA = """
CREATE TABLE IF NOT EXISTS config_state (
  key TEXT PRIMARY KEY, value TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, payload TEXT, created_at TEXT, processed INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, supplier TEXT, supplier_product_id TEXT,
  cost REAL, score TEXT, status TEXT DEFAULT 'candidate', created_at TEXT
);
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER, title TEXT, description TEXT, price REAL,
  store_listing_id TEXT, status TEXT DEFAULT 'draft', created_at TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_order_id TEXT UNIQUE,
  customer_email TEXT, ship_to TEXT, items TEXT,
  sale_total REAL, supplier_cost REAL,
  status TEXT, supplier_order_id TEXT, tracking_number TEXT,
  tracking_status TEXT, stage_ticks INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0,
  hold_reason TEXT, pending_intent INTEGER, sim_outcome TEXT DEFAULT 'deliver',
  next_check_at TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER, customer_email TEXT, channel TEXT,
  subject TEXT, body TEXT, status TEXT DEFAULT 'new',
  resolution TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER, type TEXT, amount REAL, note TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idem_key TEXT UNIQUE, type TEXT, amount REAL, payload TEXT,
  related_type TEXT, related_id INTEGER,
  status TEXT, decision_reason TEXT, result TEXT,
  created_at TEXT, executed_at TEXT
);
CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier TEXT, kind TEXT, summary TEXT, context TEXT, recommended TEXT,
  related_type TEXT, related_id INTEGER,
  status TEXT DEFAULT 'open', decision TEXT,
  created_at TEXT, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT, message TEXT, created_at TEXT, seen INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS breaker_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capability TEXT, created_at TEXT
);
"""


def init_db():
    with _LOCK:
        conn().executescript(SCHEMA)
        conn().commit()
    if get_state("wallet_balance") is None:
        set_state("wallet_balance", S.WALLET_START)
    if get_state("kill_switch") is None:
        set_state("kill_switch", "off")


def get_state(k, d=None):
    r = query_one("SELECT value FROM config_state WHERE key=?", (k,))
    return r["value"] if r else d


def set_state(k, v):
    execute(
        "INSERT INTO config_state(key,value) VALUES(?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (k, str(v)),
    )


# ---- event log ----
def publish_event(t, payload):
    return execute(
        "INSERT INTO events(type,payload,created_at,processed) VALUES(?,?,?,0)",
        (t, json.dumps(payload), now()),
    )


def unprocessed_events():
    return query("SELECT * FROM events WHERE processed=0 ORDER BY id")


def mark_event(i):
    execute("UPDATE events SET processed=1 WHERE id=?", (i,))
