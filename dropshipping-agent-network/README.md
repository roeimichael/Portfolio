# Autonomous Dropshipping Agent Network

> A draft design for a self-sufficient, agent-run dropshipping operation — sourcing,
> listing, order routing, shipment management, exception handling, and customer comms —
> with a **live Fable 5 session** acting as a 24/7 supervisor over the whole environment.

This folder now contains **both the design and a working, runnable implementation.** It
ships with no live credentials and runs entirely in a simulated "paper" mode out of the box
(Python 3 stdlib only — nothing to install, nothing to spend). Move it into your project
subfolder whenever you like.

### ▶ Run it in 30 seconds
```bash
cd dropshipping-agent-network && ./run.sh        # then open http://127.0.0.1:8787
```
Watch orders flow through the full pipeline autonomously and three issues escalate for your
approval. **See [`QUICKSTART.md`](QUICKSTART.md) for the morning walkthrough** and how to
flip on the real brain / real store one piece at a time.

For the design rationale, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the ★ docs below.

---

## The one-paragraph version

A single **Orchestrator** agent owns the business loop. It doesn't do everything itself —
it **spawns specialized subagents** (sourcing, listing, fulfillment, customer service,
finance, exceptions) on demand, each with a narrow tool set and a clear contract. State
lives in a shared **database + event queue**, not in any agent's head, so subagents are
disposable and the system survives restarts. Every outward action that costs money, ships a
product, or talks to a customer passes through a **policy/guardrail layer** that decides:
auto-approve, or escalate to a human. Sitting above all of it, a **persistent Fable 5
session** watches the live event stream, answers escalations, catches anomalies the rules
miss, and can pause the whole network with one command.

---

## Can an agent really run this end-to-end?

Honestly: **mostly yes for the digital pipeline, with humans on the rails for the risky 10%.**

| Stage | Autonomy realistic today | Why |
|---|---|---|
| Market/product research & trend scoring | ✅ High | Read-only, reversible, cheap to be wrong |
| Listing creation & copywriting | ✅ High | Reversible, draft-then-publish |
| Pricing & repricing | 🟡 Medium | Auto within guardrail bands; escalate outliers |
| Order intake → supplier order routing | 🟡 Medium | Spends money — needs balance checks + caps |
| Shipment tracking & status updates | ✅ High | Read-mostly; just polling + notifying |
| Shipment exceptions (lost/stuck/wrong) | 🟡 Medium | Decision-heavy; refund/reship needs policy |
| Customer service (tier-1) | 🟡 Medium | Auto-draft, auto-send within tone/refund limits |
| Disputes, chargebacks, fraud, returns | 🔴 Human-in-loop | Legal/financial exposure |
| Tax, supplier contracts, account standing | 🔴 Human | Compliance, can't be undone |

The design leans into this: **autonomy where actions are reversible and bounded, escalation
where they aren't.** That boundary is configuration, not code — you turn the dial up as you
build trust.

---

## What's in this folder

```
dropshipping-agent-network/
├── README.md                  ← you are here
├── QUICKSTART.md               ← ▶ run + test it (start here in the morning)
├── run.sh                      ← one-command start
├── app/                        ← the runnable system (engine, guardrail, brains, adapters…)
├── tests/test_core.py          ← 15 safety/state-machine checks
└── docs/
    ├── ARCHITECTURE.md         ← full system design, agent roster, pipeline, tech stack
    ├── AUTONOMY_ENGINE.md      ← ★ how it runs without uncertainty (deterministic core + escalation)
    ├── MARKET_INTERFACES.md    ← ★ how it actually touches the markets (every integration, edge by edge)
    ├── PROVISIONING.md         ← ★ what YOU enable for me (the capability/credential checklist)
    ├── AGENTS.md               ← per-subagent contracts (inputs, tools, outputs, limits)
    ├── LIVE_OVERSIGHT.md       ← how the Fable 5 live session plugs in and supervises
    └── ROADMAP.md              ← phased build plan, from paper-trading to real orders
```

**Start with the three ★ docs** — they answer the core questions: *how does it run
autonomously without uncertainty* (`AUTONOMY_ENGINE.md`), *how does it interface with the
markets* (`MARKET_INTERFACES.md`), and *what do you need to give me to enable it*
(`PROVISIONING.md`).

## ⚠️ Reality check before you build

- **Marketplace ToS**: Shopify/eBay/Amazon/Etsy each have rules about automation and bots.
  Use official APIs; don't scrape or fake human activity. Some platforms restrict fully
  autonomous account actions.
- **Real money + real customers**: start in a **sandbox / paper-trading mode** (Phase 0–1)
  where every "action" is logged but not executed. Only arm live execution per-capability.
- **Compliance**: refunds, taxes, consumer-protection law, and supplier agreements are real
  liabilities. Keep a human as the accountable owner — the agents are staff, you're the CEO.
- **Spend safety**: hard daily/per-order spend caps enforced *outside* the agent, in the
  guardrail layer, so no prompt can talk its way past them.
