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
cors_origins = [
    settings.app_url,
    settings.marketing_url,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

# Add www variants if the URL is a production domain
for url in [settings.app_url, settings.marketing_url]:
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


# Register routers
from app.routers import api_keys, assistants, checkout, oauth, usage, users, webhooks

app.include_router(users.router, prefix="/api/v1")
app.include_router(assistants.router, prefix="/api/v1")
app.include_router(checkout.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(usage.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(oauth.router, prefix="/api/v1")
