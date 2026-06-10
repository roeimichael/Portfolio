"""Stdlib HTTP server: live status dashboard + webhook intake + escalation
approval. No framework, no deps. Runs in a thread alongside the worker.

  GET  /                      dashboard (orders, escalations, spend, P&L)
  GET  /approve?id=&verdict=  resolve an escalation (approve|deny)
  POST /kill  /resume         flip the kill switch
  POST /webhooks/shopify      order.created intake (live)
  POST /webhooks/aftership    tracking.update intake (live)
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from .config import S
from . import db, engine, escalations, adapters


def _rows(sql, p=()):
    return [dict(r) for r in db.query(sql, p)]


def _pnl():
    r = db.query_one(
        "SELECT COALESCE(SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END),0) rev,"
        "COALESCE(SUM(CASE WHEN type IN ('cost','refund') THEN amount ELSE 0 END),0) spend "
        "FROM ledger")
    return float(r["rev"]), float(r["spend"])


def _today_spend():
    r = db.query_one("SELECT COALESCE(SUM(amount),0) s FROM ledger "
                     "WHERE type IN ('cost','refund') AND substr(created_at,1,10)=?", (db.today(),))
    return float(r["s"])


def dashboard_html():
    rev, spend = _pnl()
    today = _today_spend()
    wallet = adapters.wallet_balance()
    kill = db.get_state("kill_switch")
    orders = _rows("SELECT * FROM orders ORDER BY id DESC LIMIT 40")
    escs = _rows("SELECT * FROM escalations WHERE status='open' ORDER BY id DESC")
    notes = _rows("SELECT * FROM notifications ORDER BY id DESC LIMIT 15")

    def esc_row(e):
        rec = json.loads(e["recommended"] or "{}")
        return (f"<tr><td>#{e['id']}</td><td><b>{e['tier']}</b></td><td>{e['kind']}</td>"
                f"<td>{e['summary']}</td><td>{rec.get('action','')}</td>"
                f"<td><a href='/approve?id={e['id']}&verdict=approve'>✅ approve</a> · "
                f"<a href='/approve?id={e['id']}&verdict=deny'>❌ deny</a></td></tr>")

    def ord_row(o):
        return (f"<tr><td>{o['id']}</td><td>{o['store_order_id']}</td><td>{o['status']}</td>"
                f"<td>{o['tracking_status'] or ''}</td><td>${o['sale_total']:.2f}</td>"
                f"<td>${o['supplier_cost']:.2f}</td><td>{o['tracking_number'] or ''}</td></tr>")

    kill_btn = ("<form method='post' action='/resume' style='display:inline'>"
                "<button>▶ resume</button></form>" if kill == "on"
                else "<form method='post' action='/kill' style='display:inline'>"
                     "<button>⏸ KILL SWITCH (draft-only)</button></form>")

    return f"""<!doctype html><html><head><meta charset=utf-8>
<meta http-equiv=refresh content=4><title>Dropship Ops</title>
<style>body{{font:14px system-ui;margin:24px;background:#0b1020;color:#dde}}
h1{{margin:0 0 4px}} .grid{{display:flex;gap:24px;flex-wrap:wrap;margin:12px 0}}
.card{{background:#151b33;border:1px solid #263; border-radius:10px;padding:12px 16px}}
.big{{font-size:22px;font-weight:700}} table{{border-collapse:collapse;width:100%;margin-top:8px}}
td,th{{border-bottom:1px solid #233;padding:6px 10px;text-align:left;font-size:13px}}
a{{color:#7cf}} button{{background:#2a3a6a;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer}}
.kill{{color:{'#f66' if kill=='on' else '#6f6'}}}</style></head><body>
<h1>🛰️ Dropshipping Ops — <span class=kill>{'KILL SWITCH ON (draft-only)' if kill=='on' else 'LIVE'} · {S.MODE} mode</span></h1>
<div class=grid>
 <div class=card>P&amp;L<br><span class=big>${rev-spend:,.2f}</span><br><small>rev ${rev:,.2f} / spend ${spend:,.2f}</small></div>
 <div class=card>Today spend<br><span class=big>${today:,.2f}</span><br><small>daily cap ${S.DAILY_CAP:,.0f}</small></div>
 <div class=card>Wallet (money-out)<br><span class=big>${wallet:,.2f}</span></div>
 <div class=card>Open escalations<br><span class=big>{len(escs)}</span></div>
 <div class=card>{kill_btn}</div>
</div>
<h3>🔴 Escalations needing a human</h3>
<table><tr><th>#</th><th>tier</th><th>kind</th><th>summary</th><th>recommended</th><th>decide</th></tr>
{''.join(esc_row(e) for e in escs) or '<tr><td colspan=6>none — all clear ✅</td></tr>'}</table>
<h3>Orders</h3>
<table><tr><th>id</th><th>store#</th><th>status</th><th>tracking</th><th>sale</th><th>cost</th><th>track#</th></tr>
{''.join(ord_row(o) for o in orders)}</table>
<h3>Recent activity</h3>
<table>{''.join(f"<tr><td>{n['level']}</td><td>{n['message']}</td></tr>" for n in notes)}</table>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="text/html"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(body.encode() if isinstance(body, str) else body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/":
            return self._send(200, dashboard_html())
        if u.path == "/approve":
            q = parse_qs(u.query)
            eid = int(q.get("id", [0])[0])
            verdict = q.get("verdict", ["deny"])[0]
            res = engine.resolve_escalation(eid, {"verdict": verdict})
            return self._send(200, f"<p>Escalation #{eid}: {verdict} -> {res}</p>"
                                   f"<p><a href='/'>back</a></p>")
        if u.path == "/status.json":
            rev, spend = _pnl()
            return self._send(200, json.dumps({
                "mode": S.MODE, "pnl": rev - spend, "today_spend": _today_spend(),
                "wallet": adapters.wallet_balance(),
                "open_escalations": len(_rows("SELECT 1 FROM escalations WHERE status='open'")),
            }), "application/json")
        return self._send(404, "not found")

    def do_POST(self):
        u = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b"{}"
        if u.path == "/kill":
            db.set_state("kill_switch", "on")
            return self._send(200, "<p>kill switch ON</p><a href='/'>back</a>")
        if u.path == "/resume":
            db.set_state("kill_switch", "off")
            return self._send(200, "<p>resumed</p><a href='/'>back</a>")
        if u.path == "/webhooks/shopify":
            p = json.loads(raw or b"{}")
            db.publish_event("order.created", _shopify_to_order(p))
            return self._send(200, "ok")
        if u.path == "/webhooks/aftership":
            p = json.loads(raw or b"{}")
            msg = p.get("msg", p)
            db.publish_event("tracking.update", {
                "tracking_number": msg.get("tracking", {}).get("tracking_number") or msg.get("tracking_number"),
                "status": (msg.get("tracking", {}).get("tag") or msg.get("status", "")).lower(),
            })
            return self._send(200, "ok")
        return self._send(404, "not found")


def _shopify_to_order(p):
    # TODO: tune to your Shopify order webhook payload + your SKU->cost map
    items = [{"sku": li.get("sku"), "qty": li.get("quantity", 1),
              "price": float(li.get("price", 0)), "cost": float(li.get("cost", 0) or 0)}
             for li in p.get("line_items", [])]
    addr = p.get("shipping_address", {})
    return {
        "store_order_id": str(p.get("id") or p.get("name")),
        "customer_email": p.get("email", ""),
        "ship_to": {"address1": addr.get("address1"), "country": addr.get("country_code"),
                    "name": addr.get("name"), "city": addr.get("city"), "zip": addr.get("zip")},
        "items": items,
    }


def serve():
    srv = ThreadingHTTPServer((S.HTTP_HOST, S.HTTP_PORT), Handler)
    print(f"[server] dashboard at http://{S.HTTP_HOST}:{S.HTTP_PORT}", flush=True)
    srv.serve_forever()
