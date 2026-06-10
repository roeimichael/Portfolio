# The autonomy engine — how it runs without uncertainty

> Your ask: *runs everything autonomously, without uncertainty, and reports only the issues
> that genuinely need a human.* This doc is the core idea that makes that true rather than
> aspirational.

## The central trick: LLMs propose, deterministic code disposes

An LLM is non-deterministic by nature — the same input can produce different output. You
**cannot** put a raw LLM in the control path of something that spends money and ships goods
and expect "no uncertainty." So we don't.

The spine of the system is a **deterministic workflow engine** (a durable state machine).
It owns the lifecycle of every business object — order, shipment, ticket, listing, payout.
State transitions are **plain code**: given a state and an event, exactly one thing happens,
every time, forever. It's idempotent, durable, and replayable.

The LLM agents are called **only at "decision joints"** inside that machine, and their
output is **constrained to a small enumerated set of choices**, schema-validated. If the
agent returns something off-menu, low-confidence, or invalid → the joint takes its **safe
default, which is always "escalate," never "guess and spend."**

```
        ┌──────────────── DETERMINISTIC WORKFLOW ENGINE ────────────────┐
        │  owns every order/shipment/ticket as a durable state machine   │
        │  transitions are code · idempotent · retryable · replayable    │
        └──────┬───────────────────────┬───────────────────────┬────────┘
               │ at a decision joint…   │                       │
               ▼                        ▼                       ▼
        ┌────────────┐          ┌────────────┐          ┌────────────┐
        │ call agent │          │ call agent │          │ call agent │
        │ → must return ONE of an enumerated set, schema-validated      │
        └─────┬──────┘          └─────┬──────┘          └─────┬──────┘
              │ valid + confident          │ invalid / low-confidence / off-menu
              ▼                            ▼
        execute that branch          SAFE DEFAULT = escalate (never improvise)
```

This is the whole philosophy in one line: **the set of possible outcomes is fixed and every
outcome is safe; the LLM only chooses among them.** Non-determinism is boxed inside a
deterministic, auditable skeleton.

---

## The order lifecycle as an explicit state machine

Every order is a row with a `status`. A deterministic engine advances it. Agents/Guardrail
are touched only where marked. Nothing is ever in an undefined state.

```
 NEW ──validate(addr,fraud,stock,balance)──► READY ──route_to_supplier──► PLACED
  │            │ fail                            │ caps ok (auto)             │ confirmed
  │            ▼                                 │                            ▼
  │        ESCALATE                              │                       AWAITING_SHIP
  │     (bad address /                           │ caps exceeded              │ tracking#
  │      fraud flag)                             ▼                            ▼
  │                                          ESCALATE                     IN_TRANSIT ──delivered──► DELIVERED ──┐
  │                                       (approve spend)                     │ exception              │ +14d   │
  ▼                                                                           ▼                        ▼        ▼
 CANCELLED ◄──────────────────── compensate (refund) ◄── EXCEPTION ◄─────────┘                    SETTLED   CLOSED
```

Key properties that kill uncertainty:

- **Idempotency keys** on every side-effect (key = store order id + step). A retry can never
  double-charge or double-ship; the engine recognizes "already done" and no-ops.
- **Compensation / sagas.** If a multi-step action half-completes (customer charged but
  supplier order failed), the engine runs a defined compensating action (auto-refund). There
  is no "stuck, half-paid" limbo — every failure path has a defined exit.
- **Durable + replayable.** State survives crashes. You can replay any order to see exactly
  what each agent saw and chose. (Implement on Temporal/Inngest/Restate, or a DB-backed
  state machine for v0.)
- **Timeouts are first-class.** "Supplier hasn't confirmed in 24h," "no tracking scan in
  5 days," "delivered + 14d return window" are all timer-driven transitions, not things an
  agent has to remember to check.

Tickets (customer service) and listings have their own small state machines on the same
engine. Same rules: fixed states, coded transitions, agent only at the judgment joints,
safe default = escalate.

---

## Where each agent actually plugs in (the joints)

| Joint | Agent called | Enumerated outputs it may return |
|---|---|---|
| `NEW → READY` address/fraud judgment | (rules first; agent only on ambiguity) | `proceed` \| `escalate` |
| `READY → PLACED` supplier/variant choice | Order Router | `route(supplier,sku)` \| `escalate` |
| `EXCEPTION` resolution | Exception Handler | `reship` \| `refund` \| `contact_supplier` \| `escalate` |
| Inbound ticket | Customer Service | `reply(template/draft)` \| `refund(≤cap)` \| `escalate` |
| Listing publish | Listing Smith → Guardrail | `publish(price∈band)` \| `escalate` |

Everything **between** joints is deterministic code: polling tracking, sending a templated
"your order shipped" email, writing the ledger, advancing timers. No LLM needed, so no
uncertainty there at all.

---

## The Guardrail: hard limits that no prompt can argue past

The Guardrail is **deterministic code that physically holds the API keys and money rails.**
Agents emit *intents*; the Guardrail decides. It cannot be prompt-injected because it isn't
an LLM. It enforces, independent of any agent's reasoning:

- per-order, daily, and weekly **spend caps** + a real-balance check before any purchase
- **refund ceiling** and return-window check
- **pricing bands** for auto-publish
- **rate limits** per external API (so we never get an account flagged)
- **idempotency / dedupe** on every intent
- the **kill switch** (flip whole network to draft-only)

Best practice: back the spend cap with a **virtual card that has a hard issuer-side limit**
(see PROVISIONING.md). Then even a total software failure can't overspend — the bank says no.

---

## "Report only what needs a human" — the escalation taxonomy

**Silence is success.** You hear nothing while it works. The system surfaces an issue *only*
when a deterministic rule says a human is required. Three severity tiers, two human-facing:

| Tier | Examples | Who handles it |
|---|---|---|
| **Auto** | normal order flow, status updates, tier-1 replies within policy, cheap clear exceptions, repricing within band | The engine + agents. Logged, never surfaced. |
| **Supervisor** (Fable 5) | refund/reship above an agent's cap but below yours, ambiguous CS intent, listing price just outside band, a SKU flagged loss-making | Live Fable 5 session decides (approve/deny/edit). Reaches *you* only if it exceeds *its* authority. |
| **Human (you)** | spend above ceiling · chargeback / dispute / fraud flag · legal/safety wording · payout or bank/account change · new supplier onboarding · circuit-breaker tripped (repeated failures) · negative-margin override | Push notification with full context + a recommended action, one-tap approve/deny. |

**Mandatory-human triggers are hardcoded** — the agents cannot downgrade them. Anything
touching law, fraud, money above ceiling, or account identity always reaches you.

### Circuit breakers (the anti-runaway)
If any class of action fails N times in a window (supplier API erroring, refunds spiking,
tracking webhooks dead), the engine **trips a breaker**: that capability drops to draft-only
and one escalation fires. Better to pause and ask than to thrash. Breakers reset on your
okay or after a cool-down + clean probe.

### The notification contract (what you actually receive)
- **Nothing** during normal operation.
- A **push** only for Tier-Human items: 3-line context, the recommended action, and
  approve/deny/edit buttons. You decide in one tap; the engine executes the rest
  deterministically.
- An on-demand **"status right now"** summary you can pull anytime (open orders, in-flight
  shipments, today's spend vs cap, P&L, last anomaly, any tripped breaker).

---

## Why this gives you autonomy *without* uncertainty

1. Execution is deterministic code, not LLM output.
2. The LLM only ever picks from a fixed, safe menu; invalid/uncertain → escalate, never improvise.
3. Every side-effect is idempotent and keyed → no double-spend, no double-ship, even on retry.
4. Every failure path has a defined compensation → no stuck/limbo states.
5. Hard money limits live in deterministic code + a hard-capped card → overspend is physically impossible.
6. Mandatory-human triggers are hardcoded and un-downgradable.
7. You hear only exceptions; everything else is logged and replayable.
