# Live oversight: the Fable 5 supervisor session

The thing that makes this feel alive — and stays safe — is a **persistent Fable 5 session
watching the environment in real time**. Think of it as the on-call manager sitting above
the autonomous staff: it doesn't do the grunt work, it watches the stream, answers the hard
calls, catches what the rules miss, and can stop everything.

---

## What "monitoring live at all times" actually means

A live agent session can't literally `sleep` and stare at a wall — that wastes compute and
hits context limits. Instead it's **event-driven**: the session subscribes to the bus and is
*woken* by events, exactly like this Claude Code session gets woken by GitHub webhook
activity. Between events it's idle (cheap), not spinning.

```
  EVENT BUS  ──push──►  FABLE 5 SUPERVISOR SESSION
   (orders,             • wakes on relevant events
    shipments,          • triages, decides, replies to escalations
    tickets,            • re-arms a periodic self-check (heartbeat)
    escalations,        • holds the kill switch
    anomalies)          • keeps a live status board
```

Three input channels into the session:

1. **Escalations** (highest priority) — an agent or the Guardrail couldn't act within policy
   and needs a human-level decision. The session gets the full context + a recommended
   option and replies **approve / deny / edit**. (Mechanically the same as the
   `AskUserQuestion` pattern — present the options, capture the choice, act.)
2. **Anomaly / heartbeat events** — spend nearing a cap, refund spike, a supplier going
   quiet, a SKU turning loss-making, no orders in N hours. The session investigates and
   either fixes, escalates to *you*, or notes it.
3. **Periodic self-check** — even with no events, the session re-arms a timer (e.g. hourly)
   to re-read the status board, because some conditions (CI-green-style "nothing happened"
   states) never fire an event. If all clear, it re-arms silently; if not, it acts.

---

## How it plugs in concretely

- **Subscription, not polling.** The supervisor registers interest in event types and is
  pushed messages. It never busy-loops. (This mirrors the `subscribe_pr_activity` model in
  this very harness: subscribe, end the turn, get woken by activity.)
- **A status board** the session reads on demand: open orders, in-flight shipments, tickets,
  today's spend vs cap, P&L, last anomaly. One glance = full situational awareness.
- **Authority tiers** the session is granted:
  - *Observe* — always on.
  - *Approve within manager limits* — okay a refund/reship/republish above an agent's cap
    but below yours.
  - *Throw the kill switch* — flip the network to draft-only instantly.
  - *Escalate to human (you)* — anything above its own ceiling, via push notification.
- **Two-tier escalation**: agent → Fable 5 supervisor → you. Most things stop at Fable 5;
  only the genuinely consequential reaches your phone.

---

## Why Fable 5 for this seat

The supervisor's job is fast, continuous, broad-context triage — read a stream, keep a
mental model of the whole operation, make quick judgment calls, and only spend deep
reasoning when something's genuinely hard. A fast, capable model in a long-lived session
fits that "always-on manager" shape better than spinning up a heavyweight reasoner for every
heartbeat. Reserve Opus 4.8 for the subagents doing the actual hard decisions (exceptions,
finance); let the supervisor stay responsive.

---

## What you see as the owner

- A **push notification** only when something needs *you* (above the supervisor's authority).
- An **ask-style approval** with pre-filled options when a decision is yours to make, so you
  answer in one tap.
- An always-available **"what's happening right now"** summary you can request, produced from
  the same status board the supervisor reads.

---

## Failure & safety posture

- **Supervisor down?** The Guardrail still enforces all hard caps independently — it's plain
  deterministic code, not dependent on any agent. Worst case the network degrades to
  draft-only / queue-and-wait, never to "unsupervised spending."
- **Bus down?** No events flow → no executions. Fail closed.
- **Runaway agent?** It can't exceed caps (no tools + Guardrail enforcement), and the kill
  switch is one command from either the supervisor or you.
- **Replayability**: because everything is an event, you can replay an incident to see
  exactly what each agent saw and decided.
