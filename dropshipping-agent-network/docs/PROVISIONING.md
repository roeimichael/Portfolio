# What you need to enable for me (the provisioning ask)

You asked what capabilities the system requires *from you* to hand to me. Here it is, as an
actionable checklist. The guiding principle runs through all of it:

> **Give me bounded, revocable instruments — never raw, uncapped power.** A scoped API token
> instead of your account password. A hard-capped virtual card instead of your real card. A
> sandbox before production. Every grant should be something you can cap, watch, and revoke
> in one click. That's what makes full autonomy safe.

Two columns matter: **what to provision**, and **how it's scoped so it can't hurt you.**

---

## A. The legal / business base (one-time, human-only)

These can't be delegated — they're *you* as the accountable owner. The agents are staff; you
remain the CEO on record.

- [ ] **Business entity** (LLC / sole prop) — for marketplace payouts, supplier accounts, liability.
- [ ] **Business bank account** — where revenue settles. The system only *reads* it.
- [ ] **Tax registration** (sales tax / VAT where applicable). Compliance stays human.
- [ ] **Acceptance of marketplace + supplier ToS** — you, the human, agree to them.

I cannot and should not do these. They define who's legally responsible (you), which is
exactly why a human stays in the loop for account-identity and payout changes forever.

---

## B. Storefront access (scoped, revocable)

- [ ] A **Shopify store** (start on a dev/sandbox store).
- [ ] A **custom app** → Admin API access token, **least-privilege scopes**:
      `read/write_products`, `read_orders`, `write_fulfillments`, `read/write_customers`, `read_inventory`.
- [ ] Permission to **register webhooks** (orders/create, fulfillments/update, refunds/create).

**Scope guard:** a custom-app token can be **revoked in one click** and never includes
billing/owner powers. Start it on a dev store so early mistakes touch nothing real.

---

## C. Supplier access (start POD — lowest risk)

- [ ] A **Printful or Printify** account + **API token** (recommended first supplier — no
      inventory risk, fully API-driven).
- [ ] *(scale later)* **CJ Dropshipping** account + API key **+ a preloaded wallet**.
- [ ] *(scale later)* AliExpress DS app approval.

**Scope guard:** prefer suppliers with a **preloadable wallet** so my spend is bounded by the
balance you set, not by trust.

---

## D. The money rails (the one that needs the most care)

**Money IN** — read-only to me:
- [ ] Connect **Shopify Payments / Stripe** so revenue settles to your bank. I only read it.

**Money OUT** — this is the capability that most needs bounding. Give me **one** of:
- [ ] **A preloaded supplier wallet** (CJ-style) — I spend only what's loaded; top-ups are a
      human approval. *(simplest, very safe)* — **recommended to start.**
- [ ] **A virtual card with hard issuer-side limits** (Stripe Issuing / Ramp / Privacy.com),
      locked to the supplier merchant, with a hard **per-transaction + daily + monthly cap.**
      Even a total software failure can't overspend — the *bank* declines. *(strongest
      guarantee)*

**Never:** your real/personal card with no limit. The whole "without uncertainty" promise on
spending rests on this being a bounded instrument.

---

## E. Customer communication

- [ ] A **sending domain** + DNS access to add **SPF/DKIM/DMARC** (so mail authenticates).
- [ ] An **email provider** account (Postmark / SES) — API token.
- [ ] *(recommended)* A **helpdesk** (Gorgias / Front / Zendesk) API token, so support stays
      a human-readable thread you can audit and take over anytime.
- [ ] *(optional)* **Twilio** for SMS/WhatsApp.

**Scope guard:** transactional mail is template-only; free-text replies are policy/tone-checked
and capped before send; anything legal/safety/chargeback escalates to you.

---

## F. Shipping / tracking

- [ ] An **AfterShip** (or EasyPost / 17track) account + API token + webhook permission.

Low risk — mostly read + push status. No money, no irreversible action.

---

## G. Where it runs (infra) + the agent runtime

- [ ] A small **always-on host** (a VM / container service) for the workflow engine + MCP
      servers — this is the 24/7 brain. (The remote session I run in here is ephemeral; the
      live operation needs its own persistent home.)
- [ ] **Postgres** (business state) + **Redis/NATS/SQS** (event bus) + object storage (images).
- [ ] A **secrets manager** (so credentials live there, not in code or in any prompt).
- [ ] An **Anthropic API key** for the Agent SDK (Orchestrator + subagents + the live
      supervisor session).

**Scope guard:** secrets live in the manager; MCP servers read them at call time; **no agent
prompt ever contains a credential.**

---

## H. How I reach you (the approval channel)

- [ ] Pick a channel for Tier-Human escalations: **push** (Claude Code mobile/web), or a
      **Slack / Telegram / WhatsApp** the supervisor posts to with approve/deny/edit.
- [ ] Decide your **availability expectation** (e.g. "if no response in 6h on a non-urgent
      item, hold in draft, don't act").

This is the only channel through which the business "bothers" you — by design, only for
things above the supervisor's authority.

---

## I. The authority configuration (you set the numbers — this is your steering wheel)

You define the dial; the deterministic Guardrail enforces it. Suggested starting values:

| Knob | Starter value | What it controls |
|---|---|---|
| Per-order spend cap | e.g. $40 | max I can spend routing one order before escalating |
| Daily spend cap | e.g. $200 | total/day before everything pauses to draft-only |
| Refund ceiling (auto) | e.g. $25 | CS/Exception can refund up to this without you |
| Pricing band (auto-publish) | e.g. cost ×2.2–×3.5 | price range I can list within unaided |
| Supervisor authority | e.g. up to $100 | what Fable 5 can approve before it must reach you |
| Auto-publish listings? | start **off** | whether new listings go live without your okay |
| Circuit-breaker threshold | e.g. 3 fails / 15 min | when a capability auto-pauses |

Everything outside these bands escalates. You raise them as trust builds (see ROADMAP.md).

---

## Minimum viable grant (the smallest set to start a real, safe loop)

To run the **first genuinely autonomous loop at near-zero risk**, I need just:

1. **Dev Shopify store** + scoped custom-app token (B)
2. **Printify/Printful** token (C — POD, no inventory risk)
3. **A preloaded wallet or hard-capped virtual card** with a tiny limit (D)
4. **Postmark** token + a sending domain (E)
5. **AfterShip** token (F)
6. A small **host + Postgres + Redis + secrets manager + Anthropic key** (G)
7. An **approval channel** + your **starter caps** (H, I)

With those, Phase 0–2 of the roadmap runs: source → list → sell → POD-fulfill → track →
notify → reconcile, fully autonomous within tight caps, escalating only the genuinely
human-level calls. Everything else (CJ/AliExpress, more channels, higher caps) is added by
turning the dial, never by handing over more raw power.

---

## What I will *never* ask you to hand me

- Your account passwords or owner/billing access (scoped tokens only).
- An uncapped or personal payment instrument (bounded wallet / hard-capped card only).
- Authority over legal, tax, payout-account, or supplier-contract decisions (always yours).

If anything ever seems to ask for one of these, that itself is a red flag to escalate.
