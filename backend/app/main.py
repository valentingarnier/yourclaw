import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("yourclaw")

app = FastAPI(
    title="YourClaw API",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Build CORS origins list (include www variants automatically)
# Strip trailing slashes - CORS requires exact match
app_url = settings.app_url.rstrip("/")
marketing_url = settings.marketing_url.rstrip("/")

cors_origins = [
    app_url,
    marketing_url,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

# Add www variants if the URL is a production domain
for url in [app_url, marketing_url]:
    if url.startswith("https://") and not url.startswith("https://www."):
        # Add www variant: https://example.com -> https://www.example.com
        cors_origins.append(url.replace("https://", "https://www."))
    elif url.startswith("https://www."):
        # Add non-www variant: https://www.example.com -> https://example.com
        cors_origins.append(url.replace("https://www.", "https://"))

logger.info(f"CORS allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")


@app.post("/api/v1/test/welcome-email")
async def test_welcome_email(
    email: str = "test@example.com",
    first_name: str = "Valentin",
    channel: str = "WHATSAPP",
) -> dict:
    """Test endpoint to preview/send the welcome email.

    Usage: POST /api/v1/test/welcome-email?email=you@example.com&first_name=John&channel=TELEGRAM
    """
    from app.services.email_service import send_welcome_email

    await send_welcome_email(email, first_name, channel)
    return {"status": "sent", "to": email, "first_name": first_name, "channel": channel}


@app.post("/api/v1/test/cancellation-email")
async def test_cancellation_email(
    email: str = "test@example.com",
    first_name: str = "Valentin",
    channel: str = "WHATSAPP",
) -> dict:
    """Test endpoint to preview/send the cancellation email.

    Usage: POST /api/v1/test/cancellation-email?email=you@example.com&first_name=John&channel=TELEGRAM
    """
    from app.services.email_service import send_cancellation_email

    await send_cancellation_email(email, first_name, channel)
    return {"status": "sent", "to": email, "first_name": first_name, "channel": channel}


# Register routers
from app.routers import api_keys, assistants, checkout, oauth, usage, users, webhooks

app.include_router(users.router, prefix="/api/v1")
app.include_router(assistants.router, prefix="/api/v1")
app.include_router(checkout.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(usage.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(oauth.router, prefix="/api/v1")
