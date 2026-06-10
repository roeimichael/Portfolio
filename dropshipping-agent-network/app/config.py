"""Central configuration. Reads environment + an optional local .env file.

Everything has a safe default so the system runs in `paper` mode with NO
credentials and NO API cost. Fill in .env to go live, one capability at a time.
"""
import os


def _load_dotenv(path=".env"):
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


_load_dotenv()


def _f(k, d):
    try:
        return float(os.environ.get(k, d))
    except Exception:
        return float(d)


def _b(k, d):
    return str(os.environ.get(k, d)).lower() in ("1", "true", "yes", "on")


class Settings:
    # paper = fully simulated, no external calls, no cost. live = real adapters.
    MODE = os.environ.get("MODE", "paper")
    DB_PATH = os.environ.get("DB_PATH", "dropship.db")

    HTTP_HOST = os.environ.get("HTTP_HOST", "127.0.0.1")
    HTTP_PORT = int(_f("HTTP_PORT", 8787))

    # ---- Authority dials (the Guardrail enforces these deterministically) ----
    PER_ORDER_CAP = _f("PER_ORDER_CAP", 40)
    DAILY_CAP = _f("DAILY_CAP", 200)
    REFUND_CEILING = _f("REFUND_CEILING", 25)
    SUPERVISOR_AUTHORITY = _f("SUPERVISOR_AUTHORITY", 100)
    PRICE_BAND_LOW = _f("PRICE_BAND_LOW", 2.2)
    PRICE_BAND_HIGH = _f("PRICE_BAND_HIGH", 3.5)
    AUTO_PUBLISH = _b("AUTO_PUBLISH", "false")
    BREAKER_THRESHOLD = int(_f("BREAKER_THRESHOLD", 3))
    BREAKER_WINDOW_SEC = int(_f("BREAKER_WINDOW_SEC", 900))

    # Bounded money-out instrument (simulated hard issuer cap in paper mode).
    WALLET_START = _f("WALLET_START", 500)

    # ---- Agent brains ----
    USE_LLM = _b("USE_LLM", "false")  # off by default => deterministic, free
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    BRAIN_MODEL = os.environ.get("BRAIN_MODEL", "claude-haiku-4-5-20251001")

    # ---- live adapter credentials (only needed when MODE=live) ----
    SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
    SHOPIFY_TOKEN = os.environ.get("SHOPIFY_TOKEN", "")
    SUPPLIER = os.environ.get("SUPPLIER", "printify")  # printify | cj | mock
    PRINTIFY_TOKEN = os.environ.get("PRINTIFY_TOKEN", "")
    PRINTIFY_SHOP_ID = os.environ.get("PRINTIFY_SHOP_ID", "")
    AFTERSHIP_TOKEN = os.environ.get("AFTERSHIP_TOKEN", "")
    POSTMARK_TOKEN = os.environ.get("POSTMARK_TOKEN", "")
    FROM_EMAIL = os.environ.get("FROM_EMAIL", "support@example.com")

    # ---- worker / simulation timing ----
    TICK_SEC = _f("TICK_SEC", 2)
    # ticks an order spends in each transit stage during paper simulation
    SIM_STAGE_TICKS = int(_f("SIM_STAGE_TICKS", 2))


S = Settings()
