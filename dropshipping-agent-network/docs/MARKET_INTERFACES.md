# Market interfaces — how it actually touches the world

Every external system is reached through a dedicated **MCP server** that owns exactly one
integration's credentials, rate limits, and idempotency. Agents never hold raw keys; they
call the MCP tool, which calls the API. This keeps credentials isolated, every call audited,
and any one integration swappable without touching the rest.

There are five edges to the world: **sell** (storefront), **buy/fulfill** (supplier),
**track** (shipping), **money** (payments in + out), and **talk** (customer comms). Plus a
read-only **signals** edge for research.

---

## Edge 1 — Storefront (where customers buy)

| | Detail |
|---|---|
| **Best fit** | **Shopify** — friendliest to apps, clean Admin API, reliable webhooks |
| **Auth** | A **custom app** in your store → Admin API access token, scoped (least privilege) |
| **Scopes needed** | `read/write_products`, `read_orders`, `write_fulfillments`, `read/write_customers`, `read_inventory` |
| **Inbound** | Webhooks: `orders/create`, `orders/cancelled`, `refunds/create`, `fulfillments/update` → land on the event bus |
| **Outbound** | GraphQL Admin API: create/publish products, set prices, create fulfillments, attach tracking |
| **ToS note** | Shopify *welcomes* app automation. Stay within API rate limits; don't simulate human UI actions. |
| **Autonomy risk** | Low. Listings are reversible (draft→publish→unpublish). |

Other channels (add later, each its own MCP server): **eBay** Sell API, **Etsy** Open API
v3, **TikTok Shop** API, **WooCommerce** REST. **Amazon SP-API** is powerful but
approval-heavy and strict — not a v0 channel.

---

## Edge 2 — Supplier (where you buy / who ships)

This is the highest-leverage choice for *autonomy*, because it decides how much uncertainty
exists between "customer paid" and "package moving."

### Recommended starting path: **Print-on-Demand (Printful / Printify)** 🟢
- **Why**: lowest uncertainty. No inventory gamble, no "was it in stock," no separate
  purchase risk. Order placed via API → POD prints, packs, ships, returns a tracking number.
  Fully API-driven end to end. Best possible first autonomous loop.
- **Auth**: API token. **Endpoints**: catalog, create order, order status, shipping rates,
  tracking. **Money**: charged to a card/wallet on file per order.

### Scaled path: **CJ Dropshipping** 🟡
- Real automation API: product query, **order creation**, **balance/wallet**, tracking,
  dispute. **Money**: preload a CJ **wallet** — this is great for safety (agent spends from a
  bounded wallet, not your card).
- More SKU variety than POD; more variability in stock/ship time → more exception handling.

### Aggregators: **Zendrop / Spocket / AutoDS / DSers** 🟡
- Sit between you and many suppliers; some expose APIs. Useful breadth, variable API quality.

### Direct **AliExpress** (AE Dropshipping Open Platform) 🔴 for v0
- Powerful but: app approval required, per-order card payment (harder to bound), more
  stock/price drift, longer ship times → most exception load. Add once the machinery is proven.

> **Design stance:** start POD-only (near-zero fulfillment uncertainty), prove the full
> autonomous loop, then add CJ/AliExpress and lean on the Exception Handler for their messiness.

---

## Edge 3 — Shipping & tracking

| | Detail |
|---|---|
| **Provider** | **AfterShip** (or EasyPost / 17track) — one API across ~1000 carriers |
| **Flow** | Supplier returns a tracking number → register it with the tracker → tracker pushes **status webhooks** (info_received, in_transit, out_for_delivery, delivered, **exception**) onto the bus |
| **Deterministic part** | Status → customer notification mapping is pure code (templates). No LLM. |
| **Agent part** | Only on `exception` (lost/stuck/customs/returned) → Exception Handler joint. |
| **Autonomy risk** | Low for happy path; the `exception` status is the trigger for the one decision-heavy joint. |

---

## Edge 4 — Money (the careful edge)

Two opposite-direction rails, designed very differently.

### Money IN (revenue) — low risk
- **Shopify Payments / Stripe / PayPal** settle customer payments to **your** bank. The
  system only *reads* this (reconciliation). No agent ever moves money inbound.

### Money OUT (paying suppliers) — the risk concentrates here
This is where "without uncertainty" must be *physically* enforced, not just policy:

1. **Preloaded supplier wallet** (CJ-style) — agent spends from a bounded balance. When low,
   topping it up is a **Tier-Human escalation**. Clean and safe.
2. **Virtual card with hard issuer-side limits** (Stripe Issuing / Ramp / Privacy.com) —
   issue a card locked to the supplier merchant with a hard **daily/monthly cap and
   per-transaction cap set at the bank**. Even a total software bug can't overspend — the
   issuer declines. This is the strongest guarantee in the whole system.

> **Principle: never hand the agent an uncapped payment instrument.** Give it a bounded
> wallet or a hard-capped virtual card. The Guardrail's software caps sit *on top* as a
> second layer; the card is the floor that can't be argued past.

---

## Edge 5 — Customer communication

| Channel | Provider | Use |
|---|---|---|
| **Email (transactional)** | Postmark / SES | "shipped," "delivered," receipts — templated, deterministic |
| **Support inbox** | **Helpdesk API** (Gorgias / Front / Zendesk) | inbound questions → CS agent; keeps a human-readable thread |
| **SMS / WhatsApp** | Twilio | optional status + support |

- Sending domain needs **SPF/DKIM/DMARC** DNS records (so mail authenticates, doesn't spam-fold).
- Transactional notices are **template + variables only** (no free-text from a cheap model).
- Free-text replies come from the CS agent, **policy/tone-checked before send**, within
  refund/return limits; anything legal/safety/chargeback → escalate.

---

## Edge 6 — Signals (read-only research)

For the Sourcing Scout: Google Trends, marketplace best-seller feeds, Meta/TikTok ad
libraries, keyword/competition data, supplier review quality. All **read-only**, so zero
execution risk — worst case is a bad *proposal*, which a human or the supervisor vets before
anything publishes.

---

## The full data flow, one picture

```
 SIGNALS ─read─► Sourcing Scout ─proposes─► Listing Smith ─draft─► [Guardrail] ─► Shopify (publish)
                                                                                      │
                                                                          customer buys │ webhook
                                                                                      ▼
   AfterShip ◄─track#─ Supplier(POD/CJ) ◄─[Guardrail: card/wallet cap]◄─ Order Router ◄─ order.created
      │ status webhook                                                                    │
      ▼                                                                                   ▼
   deterministic notify (Postmark/Twilio) ─────────────────────────────────────► customer
      │ exception?
      ▼
   Exception Handler ──(reship/refund≤cap | escalate)──► [Guardrail] ──► supplier / refund / you
                                                                                      ▲
   Stripe/Shopify Payments ─read─► Finance/Reconciler ─anomaly?─► escalate ───────────┘
```

Every arrow into the world passes a Guardrail or is read-only. That's the rule.
