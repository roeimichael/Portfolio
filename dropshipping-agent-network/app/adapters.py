"""External-world edges. Each function is a MOCK in paper mode and a real
HTTP call in live mode. Real calls use only stdlib urllib so there are no deps.

Live adapters are best-effort and marked TODO where field-tuning against the
real API response shape will be needed the first time you connect a real account.
"""
import json
import urllib.request
import urllib.error
import random
import string

from .config import S
from . import db


def _rand(n=8):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def _http(method, url, token_header, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header(token_header, token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read().decode()[:500]}
    except Exception as e:  # network etc.
        return {"_error": "network", "_detail": str(e)}


# ----------------------------------------------------------------------------
# PAYMENTS / money-out — a bounded wallet. In paper mode this simulates a
# hard issuer-capped virtual card: you physically cannot spend past the balance.
# ----------------------------------------------------------------------------
def wallet_balance():
    return float(db.get_state("wallet_balance", 0))


def wallet_charge(amount, ref):
    bal = wallet_balance()
    if amount > bal + 1e-9:
        return {"ok": False, "reason": "insufficient_wallet", "balance": bal}
    db.set_state("wallet_balance", round(bal - amount, 2))
    return {"ok": True, "balance": round(bal - amount, 2)}


def wallet_topup(amount):
    db.set_state("wallet_balance", round(wallet_balance() + amount, 2))
    return wallet_balance()


# ----------------------------------------------------------------------------
# SUPPLIER — place order / fulfillment. POD (Printify) by default.
# ----------------------------------------------------------------------------
def supplier_place_order(order, items):
    """Returns {ok, supplier_order_id, cost, tracking_number} or {ok:False,...}."""
    cost = round(sum(float(i["cost"]) * int(i.get("qty", 1)) for i in items), 2)
    if S.MODE == "paper" or S.SUPPLIER == "mock":
        return {
            "ok": True,
            "supplier_order_id": "SUP-" + _rand(),
            "cost": cost,
            "tracking_number": "TRK" + _rand(10),
        }
    # ---- live: Printify ----
    if S.SUPPLIER == "printify":
        url = f"https://api.printify.com/v1/shops/{S.PRINTIFY_SHOP_ID}/orders.json"
        payload = {  # TODO: map your real line_items / address_to shape
            "label": order["store_order_id"],
            "line_items": items,
            "address_to": json.loads(order["ship_to"]),
            "send_shipping_notification": False,
        }
        res = _http("POST", url, "Authorization", f"Bearer {S.PRINTIFY_TOKEN}", payload)
        if res.get("_error"):
            return {"ok": False, "reason": "supplier_api", "detail": res}
        return {
            "ok": True,
            "supplier_order_id": str(res.get("id", "SUP-" + _rand())),
            "cost": cost,
            "tracking_number": None,  # arrives later via tracking poll
        }
    return {"ok": False, "reason": "unknown_supplier"}


def supplier_message(supplier_order_id, text):
    if S.MODE == "paper":
        return {"ok": True}
    return {"ok": True, "note": "TODO: supplier messaging API"}


# ----------------------------------------------------------------------------
# STOREFRONT — Shopify
# ----------------------------------------------------------------------------
def shopify_publish(listing):
    if S.MODE == "paper":
        return {"ok": True, "store_listing_id": "SHOP-" + _rand()}
    base = f"https://{S.SHOPIFY_STORE}/admin/api/2024-10/products.json"
    payload = {  # TODO: map variants/images to your catalog
        "product": {
            "title": listing["title"],
            "body_html": listing["description"],
            "variants": [{"price": str(listing["price"])}],
            "status": "active",
        }
    }
    res = _http("POST", base, "X-Shopify-Access-Token", S.SHOPIFY_TOKEN, payload)
    if res.get("_error"):
        return {"ok": False, "detail": res}
    return {"ok": True, "store_listing_id": str(res.get("product", {}).get("id"))}


def shopify_refund(order, amount):
    if S.MODE == "paper":
        return {"ok": True}
    return {"ok": True, "note": "TODO: Shopify refund API call"}


# ----------------------------------------------------------------------------
# SHIPPING — AfterShip
# ----------------------------------------------------------------------------
def aftership_register(tracking_number):
    if S.MODE == "paper":
        return {"ok": True}
    res = _http(
        "POST",
        "https://api.aftership.com/v4/trackings",
        "aftership-api-key",
        S.AFTERSHIP_TOKEN,
        {"tracking": {"tracking_number": tracking_number}},
    )
    return {"ok": not res.get("_error"), "detail": res}


# ----------------------------------------------------------------------------
# EMAIL / customer comms — Postmark
# ----------------------------------------------------------------------------
def send_email(to, subject, body):
    db.execute(
        "INSERT INTO notifications(level,message,created_at,seen) VALUES('email',?,?,0)",
        (f"to {to}: {subject} — {body[:120]}", db.now()),
    )
    if S.MODE == "paper":
        return {"ok": True}
    res = _http(
        "POST",
        "https://api.postmarkapp.com/email",
        "X-Postmark-Server-Token",
        S.POSTMARK_TOKEN,
        {"From": S.FROM_EMAIL, "To": to, "Subject": subject, "TextBody": body},
    )
    return {"ok": not res.get("_error"), "detail": res}
