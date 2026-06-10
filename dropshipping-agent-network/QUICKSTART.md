# Quickstart — start here in the morning ☀️

This is a **working, runnable** implementation of the design in `docs/`. It runs in
**paper mode** with zero credentials, zero cost, and zero dependencies (Python 3 stdlib
only), so you can test the entire autonomous loop in about 30 seconds. Then you turn on real
pieces one at a time.

---

## 1. Test it right now (no config, no install)

```bash
cd dropshipping-agent-network
chmod +x run.sh
./run.sh
```

That seeds a simulated batch and starts the live system. Open the dashboard:

> **http://127.0.0.1:8787**

You'll watch — live, refreshing every few seconds — orders move through the whole pipeline
**by themselves**: validated → supplier-ordered → shipped → delivered → settled, customer
emails sent, a shipment exception auto-resolved by reship, and P&L ticking up.

Three things will **stop and ask you** (this is the "report only what needs a human" part):

| What you'll see in the red Escalations box | Why |
|---|---|
| Order 1002 — *spend approval ($52)* | over the $40 per-order cap |
| Order 1004 — *missing address* | failed validation |
| Customer message — *chargeback/dispute* | legal exposure |

Click **✅ approve** or **❌ deny** on each and watch the system act on your decision
(approve 1002 → it ships and closes; deny → it cancels and refunds the customer).

Prefer the terminal? In another window:
```bash
python3 -m app.cli status         # text snapshot
python3 -m app.cli escalations    # list what needs you
python3 -m app.cli approve 3      # approve escalation #3  (add "deny" to deny)
```

## 2. Prove the safety (optional, 5 sec)

```bash
python3 -m tests.test_core
```
15 checks: hard caps can't be exceeded, no double-charge on retry, the wallet is a hard
ceiling, exceptions auto-resolve within policy, and the right things escalate.

---

## 3. Turn on the real brain (optional)

Let Claude make the judgment calls instead of the built-in heuristics:
```bash
pip install -r requirements.txt
cp .env.example .env
# in .env set:  USE_LLM=true   and   ANTHROPIC_API_KEY=sk-ant-...
./run.sh
```
Same loop, same guardrails — the *decisions* at each joint are now made by the model,
constrained to the same safe menu (uncertain → escalate).

---

## 4. Go live on a real store (when you're ready — this is the "small bits left")

Fill these into `.env` and set `MODE=live`. See `docs/PROVISIONING.md` for exactly how to
get each one and how it's scoped so it can't hurt you. Minimum viable set:

- [ ] `SHOPIFY_STORE` + `SHOPIFY_TOKEN` — custom-app admin token (dev store first)
- [ ] `PRINTIFY_TOKEN` + `PRINTIFY_SHOP_ID` — POD supplier (no inventory risk)
- [ ] `AFTERSHIP_TOKEN` — tracking
- [ ] `POSTMARK_TOKEN` + `FROM_EMAIL` — customer email (add SPF/DKIM DNS)
- [ ] a small **WALLET_START** / a hard-capped virtual card as the money-out instrument
- [ ] your **caps** (`PER_ORDER_CAP`, `DAILY_CAP`, `REFUND_CEILING`)

Then point your Shopify "order created" webhook at `POST /webhooks/shopify` and your
AfterShip webhook at `POST /webhooks/aftership` (expose the port with a tunnel like
`cloudflared`/`ngrok`, or deploy to a small always-on host).

> ⚠️ The live adapters in `app/adapters.py` and `app/server.py` have `TODO` markers where the
> exact payload shape needs tuning against your real account the first time you connect — these
> are clearly flagged. Run with a low `DAILY_CAP` and `AUTO_PUBLISH=false` for the first real
> orders, exactly as `docs/ROADMAP.md` describes.

---

## What's where

| File | Role |
|---|---|
| `app/engine.py` | the deterministic state machine (orders + tickets) — the "no uncertainty" core |
| `app/guardrail.py` | hard caps, idempotency, kill switch, the wallet — can't be argued past |
| `app/brains.py` | the decision layer (heuristics, or Claude when `USE_LLM=true`) |
| `app/adapters.py` | the market edges (Shopify / Printify / AfterShip / Postmark / wallet) |
| `app/worker.py` | the Orchestrator heartbeat |
| `app/server.py` | live dashboard + webhook intake + approve buttons |
| `app/cli.py` | `initdb` / `run` / `simulate` / `status` / `escalations` / `approve` |
| `tests/test_core.py` | the safety proof |

The control flow maps 1:1 to `docs/AUTONOMY_ENGINE.md`. Read that for the *why*; read this
for the *how to run*.
