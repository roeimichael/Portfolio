# Architecture

## 1. Design principles

1. **State lives outside the agents.** A Postgres DB + an event queue are the source of
   truth. Agents are stateless workers that read state, act, and write results. This means
   any agent can crash or be restarted and the business keeps running.
2. **One loop, many hands.** A single long-lived Orchestrator owns the heartbeat. It spawns
   short-lived, single-purpose subagents for concrete jobs and tears them down. Subagents
   never talk to each other directly — they communicate through the queue and DB.
3. **Every side-effect goes through a Guardrail.** Spending money, shipping, messaging a
   customer, or publishing a listing is never done by an agent calling an API directly. It
   emits an *intent*; the Guardrail layer validates it against hard rules and either
   executes it or routes it to a human/Fable 5 for approval.
4. **Reversible by default, escalate the irreversible.** The autonomy dial is per-capability
   config, not hardcoded.
5. **Everything is an event.** Sourcing a product, an order arriving, a tracking update, a
   customer email — all become events on the bus. The live Fable 5 session subscribes to
   this same stream.

---

## 2. System diagram

```
                         ┌────────────────────────────────────────────┐
                         │        LIVE FABLE 5 SUPERVISOR SESSION       │
                         │  • subscribes to full event stream           │
                         │  • answers escalations (approve/deny/edit)   │
                         │  • anomaly watch + "pause everything" switch  │
                         └───────────────▲───────────────┬─────────────┘
                                         │ escalations    │ commands
                                         │                ▼
┌───────────────┐   intents    ┌──────────────────────────────────────┐
│  GUARDRAIL /  │◄─────────────│            ORCHESTRATOR               │
│  POLICY LAYER │   approved   │  business heartbeat / spawns subagents│
│  spend caps,  │─────────────►│  reads queue, dispatches work          │
│  refund rules,│   execute    └───┬───────┬───────┬───────┬───────┬───┘
│  rate limits  │                  │spawn  │spawn  │spawn  │spawn  │spawn
└───────┬───────┘                  ▼       ▼       ▼       ▼       ▼
        │ calls           ┌─────────┐ ┌────────┐ ┌──────┐ ┌─────┐ ┌──────────┐
        ▼                 │Sourcing │ │Listing │ │Order │ │Cust.│ │Exception │
┌──────────────┐          │ Scout   │ │ Smith  │ │Router│ │ Svc │ │ Handler  │
│  MCP SERVERS  │         └─────────┘ └────────┘ └──────┘ └─────┘ └──────────┘
│ • Shopify     │                 │       │        │        │         │
│ • supplier    │◄────────────────┴───────┴────────┴────────┴─────────┘
│   (AliExpress │           all read/write through
│   /CJ/Spocket)│        ┌──────────────────────────────┐
│ • shipping/   │◄───────│   SHARED STATE (Postgres)     │
│   tracking    │        │  products, listings, orders,  │
│ • email/      │        │  shipments, tickets, ledger   │
│   WhatsApp    │        └──────────────┬───────────────┘
│ • payments    │                       │
└──────────────┘                ┌───────▼────────┐
                                │  EVENT QUEUE    │ (Redis/NATS/SQS)
                                │  the bus        │
                                └────────────────┘
```

---

## 3. The dropshipping pipeline (the business loop)

```
 ① DISCOVER → ② LIST → ③ SELL → ④ ROUTE ORDER → ⑤ FULFILL/TRACK
                                                      │
 ⑧ LEARN ←─── ⑦ RECONCILE ←─── ⑥ SUPPORT / EXCEPTIONS ◄┘
```

1. **Discover** — Sourcing Scout scans supplier catalogs + trend signals, scores products
   (margin, shipping time, competition, review quality), proposes a shortlist.
2. **List** — Listing Smith writes title/description/images/variants, sets price within the
   pricing policy, publishes to the store (Guardrail-gated).
3. **Sell** — a customer buys. Store webhook → `order.created` event.
4. **Route order** — Order Router places the matching order with the supplier, validated
   against balance + spend caps. Writes `supplier_order` + cost to the ledger.
5. **Fulfill / track** — Shipment tracking polls carrier/supplier, pushes status to the
   customer, flags anything stuck.
6. **Support / exceptions** — Customer Service handles questions; Exception Handler deals
   with lost/late/wrong/damaged shipments (refund / reship / escalate per policy).
7. **Reconcile** — Finance agent matches revenue vs supplier cost vs fees, computes real
   margin, flags loss-making SKUs.
8. **Learn** — outcomes feed back into sourcing/pricing scores. Kill bad SKUs, scale winners.

---

## 4. Agent roster (summary — full contracts in AGENTS.md)

| Agent | Lifetime | Job | Spends money? | Talks to customer? |
|---|---|---|---|---|
| **Orchestrator** | Long-lived | Owns the loop, dispatches work, no direct side-effects | No | No |
| **Sourcing Scout** | Per-run | Find & score products | No | No |
| **Listing Smith** | Per-task | Create/optimize listings | No | No |
| **Order Router** | Per-order | Place supplier orders | ✅ (capped) | No |
| **Shipment Tracker** | Per-poll | Track & notify | No | ✅ (status only) |
| **Customer Service** | Per-ticket | Tier-1 support | Refunds (capped) | ✅ |
| **Exception Handler** | Per-incident | Lost/stuck/wrong shipments | Refund/reship (capped) | ✅ |
| **Finance/Reconciler** | Scheduled | Margins, P&L, anomaly flags | No | No |

---

## 5. Tech stack

- **Agent runtime**: [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk) — the
  Orchestrator is a persistent agent; subagents are spawned as subagents/sessions with
  scoped tools. Use **Opus 4.8** for the Orchestrator and decision-heavy agents (exceptions,
  finance), **Haiku 4.5** for high-volume cheap tasks (tracking polls, status notifications),
  and **Fable 5** for the live supervisor session.
- **Tools via MCP servers** — one server per external system, so credentials and rate limits
  are isolated and auditable:
  - Storefront: Shopify Admin API (orders, products, fulfillments, webhooks)
  - Supplier: AliExpress / CJ Dropshipping / Spocket / Zendrop API
  - Shipping: carrier tracking (AfterShip / EasyPost / 17track)
  - Messaging: email (Postmark/SES) + WhatsApp/SMS (Twilio)
  - Payments/ledger: Stripe + your own ledger table
- **State**: Postgres (business records) + object storage (images/listing assets).
- **Bus**: Redis Streams / NATS / SQS — durable, replayable events.
- **Guardrail layer**: a thin deterministic service (plain code, *not* an LLM) that owns
  spend caps, refund ceilings, rate limits, and the approve/escalate routing. This is the
  thing that physically holds the API keys; agents only emit intents to it.
- **Observability**: structured event log + a dashboard the Fable 5 session and you both read.

---

## 6. Why subagents instead of one big agent

- **Blast radius**: a subagent has only the tools it needs. The Sourcing Scout literally
  cannot spend money because it has no payment tool. Compromise/hallucination is contained.
- **Cost & speed**: cheap models for cheap jobs, expensive models only for judgment calls.
- **Parallelism**: 50 orders can be routed concurrently by 50 short-lived Order Routers.
- **Clear contracts**: each subagent has a typed input and output, making it testable and
  replaceable independent of the rest.

See [`AGENTS.md`](AGENTS.md) for each subagent's contract and [`LIVE_OVERSIGHT.md`](LIVE_OVERSIGHT.md)
for how the Fable 5 supervisor plugs in.
