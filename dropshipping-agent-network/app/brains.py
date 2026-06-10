"""The decision layer. At each workflow joint the engine asks a brain to choose
ONE option from a fixed menu. Output is validated against that menu; anything
off-menu / low-confidence / errored becomes 'escalate' — never an improvised act.

Two implementations:
  * deterministic (default, free, no key) — keyword/threshold heuristics.
  * llm (USE_LLM=true + ANTHROPIC_API_KEY) — Claude constrained to the menu.

Either way the contract is identical and the safe default is the same.
"""
from .config import S


def decide(joint, ctx, options):
    """Return {choice, params, confidence, rationale, source}. choice in options."""
    if S.USE_LLM and S.ANTHROPIC_API_KEY:
        try:
            out = _llm_decide(joint, ctx, options)
            if out and out.get("choice") in options:
                out.setdefault("params", {})
                out["source"] = "llm"
                return out
        except Exception as e:
            return {"choice": "escalate", "params": {}, "confidence": 0,
                    "rationale": f"llm_error: {e}", "source": "fallback"}
    out = _heuristic(joint, ctx, options)
    out["source"] = "heuristic"
    return out


# ---------------------------------------------------------------------------
# Deterministic heuristics
# ---------------------------------------------------------------------------
def _heuristic(joint, ctx, options):
    if joint == "validate_order":
        ship = ctx.get("ship_to") or {}
        if not ship.get("address1") or not ship.get("country"):
            return _c("escalate", 0.9, "missing_address")
        if int(ctx.get("total_qty", 1)) > 20:
            return _c("escalate", 0.8, "suspicious_quantity")
        return _c("proceed", 0.95, "looks_clean")

    if joint == "order_router":
        if ctx.get("supplier_cost", 0) <= 0:
            return _c("escalate", 0.7, "unknown_cost")
        return _c("route", 0.9, "standard_routing",
                  params={"supplier": ctx.get("supplier", "printify")})

    if joint == "exception":
        cost = float(ctx.get("supplier_cost", 0))
        # cheap + reshippable -> reship within cap; otherwise let caps/human decide
        if cost <= S.REFUND_CEILING and ctx.get("attempts", 0) < 2:
            return _c("reship", 0.8, "cheap_reship_within_policy")
        if cost <= S.REFUND_CEILING:
            return _c("refund", 0.7, "reship_exhausted_cheap_refund")
        return _c("escalate", 0.6, "remedy_cost_above_auto_policy")

    if joint == "customer_service":
        body = (ctx.get("body") or "").lower()
        if any(w in body for w in ("chargeback", "dispute", "lawyer", "legal", "fraud", "police")):
            return _c("escalate", 0.95, "legal_or_chargeback")
        if any(w in body for w in ("where", "track", "status", "when will", "arrive")):
            return _c("reply", 0.9, "tracking_question",
                      params={"template": "tracking"})
        if any(w in body for w in ("cancel", "stop the order")):
            return _c("cancel", 0.7, "cancel_request")
        if any(w in body for w in ("refund", "return", "broke", "broken", "damaged", "wrong")):
            sale = float(ctx.get("sale_total", 0))
            if sale <= S.REFUND_CEILING:
                return _c("refund", 0.7, "refund_within_ceiling")
            return _c("escalate", 0.6, "refund_above_ceiling")
        return _c("escalate", 0.4, "intent_unclear")

    if joint == "publish_listing":
        price, cost = float(ctx.get("price", 0)), float(ctx.get("cost", 0))
        if cost > 0 and S.PRICE_BAND_LOW * cost <= price <= S.PRICE_BAND_HIGH * cost:
            if S.AUTO_PUBLISH:
                return _c("publish", 0.9, "within_band_auto")
            return _c("escalate", 0.5, "within_band_but_auto_publish_off")
        return _c("escalate", 0.6, "price_outside_band")

    return _c("escalate", 0.0, "unknown_joint")


def _c(choice, confidence, rationale, params=None):
    return {"choice": choice, "params": params or {}, "confidence": confidence,
            "rationale": rationale}


# ---------------------------------------------------------------------------
# LLM-backed decision (constrained to the menu via a forced tool call)
# ---------------------------------------------------------------------------
def _llm_decide(joint, ctx, options):
    import anthropic  # only imported when USE_LLM

    client = anthropic.Anthropic(api_key=S.ANTHROPIC_API_KEY)
    tool = {
        "name": "decide",
        "description": f"Choose exactly one action for the '{joint}' decision.",
        "input_schema": {
            "type": "object",
            "properties": {
                "choice": {"type": "string", "enum": options},
                "params": {"type": "object"},
                "confidence": {"type": "number"},
                "rationale": {"type": "string"},
            },
            "required": ["choice", "confidence", "rationale"],
        },
    }
    sys = (
        "You are a dropshipping operations agent. Choose ONE action from the allowed "
        "set. If you are uncertain, the action is unsafe, or it involves legal/fraud/"
        "chargeback exposure, choose 'escalate'. Never invent an option."
    )
    msg = client.messages.create(
        model=S.BRAIN_MODEL,
        max_tokens=400,
        system=sys,
        tools=[tool],
        tool_choice={"type": "tool", "name": "decide"},
        messages=[{"role": "user", "content":
                   f"Decision joint: {joint}\nAllowed: {options}\nContext: {ctx}"}],
    )
    for block in msg.content:
        if block.type == "tool_use":
            return block.input
    return None
