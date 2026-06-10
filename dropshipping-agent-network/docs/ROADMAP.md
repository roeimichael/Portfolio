# Build roadmap

The whole point is to **earn autonomy in stages**. Every phase runs in "draft/paper" mode
until you've watched it make good decisions, then you arm one capability for real.

---

## Phase 0 — Skeleton & paper trading (no real money, no real customers)
- Stand up: Postgres, event bus, Guardrail service (with caps wired but everything in
  `draft-only` mode), Orchestrator loop.
- Build the Sourcing Scout and Listing Smith — both read-only / draft-only by nature.
- Feed it a **sandbox Shopify store** + a supplier API in test mode.
- **Exit criteria**: it proposes sensible products and writes good draft listings you'd
  actually publish.

## Phase 1 — Simulated full loop
- Add Order Router, Shipment Tracker, Customer Service, Exception Handler, Finance — all
  emitting intents that the Guardrail **logs but does not execute**.
- Replay synthetic orders/shipments/tickets through the bus.
- Stand up the **Fable 5 supervisor session** against this simulated stream; tune
  escalation rules and the status board.
- **Exit criteria**: across a simulated week, intents the agents *would* have executed are
  ones you agree with; escalations land on the right tier.

## Phase 2 — Live listings, manual order arming
- Publish real listings (Guardrail-gated, pricing-band auto-publish).
- Real orders come in, but **Order Router intents require supervisor approval** before any
  supplier purchase. Low daily cap.
- **Exit criteria**: a stretch of orders routed correctly with the supervisor approving;
  margins reconcile.

## Phase 3 — Armed autonomy within tight caps
- Auto-execute supplier orders under a low per-order + daily cap and balance check.
- Auto-send tier-1 customer replies within tone/refund limits.
- Exception Handler auto-resolves cheap/clear cases; escalates the rest.
- Supervisor + kill switch fully live.
- **Exit criteria**: a clean week — no cap breaches, no bad customer sends, healthy margin.

## Phase 4 — Scale the dial
- Raise caps gradually as trust builds. Add more SKUs/suppliers/channels.
- Add the learning loop: outcomes feed back into sourcing/pricing scores; auto-kill
  loss-making SKUs (still as a recommendation → supervisor confirm at first).

---

## First slices worth building (smallest valuable pieces)
1. **Event bus + Guardrail in draft-only mode** — the safety spine. Build this first; it's
   what makes everything else safe to iterate on.
2. **Sourcing Scout → Listing Smith** — visible value (draft listings) with zero risk.
3. **Status board + Fable 5 supervisor on the simulated stream** — proves the live-oversight
   experience before anything touches real money.

Everything after that is turning the autonomy dial, one capability at a time.
