# Subagent contracts

Each subagent is a small, replaceable worker with a typed **input**, a fixed **tool set**,
a typed **output**, and **hard limits** it physically cannot exceed (because it lacks the
tools, and because the Guardrail enforces caps regardless of what the agent "decides").

Convention: agents emit **intents**, never raw API calls for side-effects. The Guardrail
turns approved intents into real calls.

---

## Orchestrator (long-lived, Opus 4.8)
- **Role**: owns the business heartbeat. On each tick (or event) it reads the queue/DB,
  decides what work needs doing, and spawns the right subagent with a scoped task.
- **Tools**: queue read/write, DB read, `spawn_subagent`. **No** payment, messaging, or
  publishing tools — it can only delegate.
- **Output**: dispatched tasks + a running log.
- **Limit**: cannot itself touch money, customers, or storefront.

---

## Sourcing Scout (per-run, Opus 4.8 / Sonnet)
- **Input**: niche/category, target margin, max shipping days, existing catalog.
- **Tools**: supplier catalog search (read), trend/keyword data (read), reviews (read), DB write (drafts).
- **Output**: ranked product candidates with a score breakdown
  `{margin, ship_time, competition, review_quality, risk_flags}`.
- **Limit**: read-only on the world. Proposes; never publishes or buys.

---

## Listing Smith (per-task, Sonnet)
- **Input**: an approved product candidate.
- **Tools**: image fetch/transform, copy generation, Shopify product **draft** create, DB write.
- **Output**: a draft listing (title, description, variants, images, suggested price).
- **Limit**: creates **drafts**. Publishing is a separate Guardrail-gated intent
  (auto-publish allowed only within the pricing band; otherwise escalate).

---

## Order Router (per-order, Sonnet)
- **Input**: an `order.created` event (customer order, shipping address, SKU→supplier map).
- **Tools**: supplier order **intent** emitter, DB read/write, ledger write.
- **Output**: `supplier_order` intent `{supplier, items, ship_to, expected_cost}`.
- **Limits (enforced by Guardrail, not the agent)**:
  - per-order spend cap, daily spend cap, running-balance check
  - address sanity / fraud-score check before routing
  - duplicate-order guard (idempotency key = store order id)

---

## Shipment Tracker (per-poll, Haiku 4.5)
- **Input**: open shipments due for a status check.
- **Tools**: tracking API (read), customer-notification **intent** emitter, DB write.
- **Output**: updated shipment status; `notify_customer` intents for meaningful changes
  (shipped, out-for-delivery, delivered, **exception detected**).
- **Limit**: status messages only, from approved templates. No refunds, no free-text
  promises. Stuck/anomalous shipments are handed to the Exception Handler.

---

## Customer Service (per-ticket, Sonnet, escalate to Opus)
- **Input**: an inbound customer message + full order/shipment context.
- **Tools**: knowledge base (read), reply **intent** emitter, refund **intent** (capped),
  DB write, `escalate`.
- **Output**: a drafted reply and/or an action intent.
- **Limits**:
  - tone/policy checked before send; auto-send only within confidence + policy bounds
  - refunds only up to a ceiling and within the return window; above → escalate
  - anything mentioning chargeback / legal / safety → **mandatory escalate to human**

---

## Exception Handler (per-incident, Opus 4.8)
- **Input**: a flagged shipment problem (lost, stuck N days, wrong/damaged item, customs).
- **Tools**: supplier comms intent, refund intent (capped), reship intent (capped),
  customer comms intent, DB write, `escalate`.
- **Output**: a resolution plan + the intents to execute it (e.g. "reship + apologize +
  10% credit").
- **Logic**: applies a decision policy — cheap/clear cases auto-resolved within caps;
  expensive or ambiguous cases escalate with a recommended option pre-filled so the human
  (or Fable 5) just approves/edits.

---

## Finance / Reconciler (scheduled, Opus 4.8)
- **Input**: the ledger + orders + fees over a window.
- **Tools**: DB read, ledger read, report write, `flag_anomaly`.
- **Output**: true per-SKU and overall margin, cash position, anomaly flags
  (loss-making SKU, refund spike, supplier price drift, cap nearing).
- **Limit**: read + report only. Recommends killing/scaling SKUs; doesn't execute.

---

## Cross-cutting rules

- **Idempotency**: every side-effecting intent carries a stable key; the Guardrail dedupes.
- **Audit**: every intent, decision, and approval is logged with the agent, model, inputs,
  and the rule that allowed it.
- **Kill switch**: a single flag in the Guardrail flips the whole network to "draft-only" —
  agents keep reasoning and proposing, nothing executes. The Fable 5 session and you can
  both throw it.
