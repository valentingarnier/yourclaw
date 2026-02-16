import os
import uuid

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from backend_infra.services.claw_client import ClawClient
from backend_infra.services.config_builder import (
    ChannelsConfig,
    GatewayConfig,
    ModelConfig,
    OpenclawConfig,
    ProviderKeys,
    TelegramChannelConfig,
)

app = FastAPI(title="YourClaw Control Plane")
security = HTTPBearer()

API_KEY = os.environ.get("API_KEY", "")

claw = ClawClient()


def verify_key(creds: HTTPAuthorizationCredentials = Security(security)) -> None:
    if not API_KEY or creds.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# --- Request Models ---


class ProvisionRequest(BaseModel):
    user_id: str
    claw_id: str
    anthropic_key: str = ""
    openai_key: str = ""
    google_key: str = ""
    ai_gateway_key: str = ""
    model: str = "anthropic/claude-sonnet-4.5"
    system_instructions: str | None = None
    telegram_bot_token: str = ""
    telegram_allow_from: list[str] = []


class DeprovisionRequest(BaseModel):
    user_id: str
    claw_id: str


class DeprovisionUserRequest(BaseModel):
    user_id: str


# --- Routes ---


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/provision", dependencies=[Depends(verify_key)])
async def provision(req: ProvisionRequest):
    channels = None
    if req.telegram_bot_token:
        channels = ChannelsConfig(
            telegram=TelegramChannelConfig(
                bot_token=req.telegram_bot_token,
                allow_from=req.telegram_allow_from,
            ),
        )

    config = OpenclawConfig(
        gateway=GatewayConfig(token=str(uuid.uuid4())),
        model=ModelConfig(primary=req.model),
        provider_keys=ProviderKeys(
            anthropic=req.anthropic_key,
            openai=req.openai_key,
            google=req.google_key,
            ai_gateway=req.ai_gateway_key,
        ),
        channels=channels,
        system_instructions=req.system_instructions,
    )
    result = await claw.provision_claw(req.user_id, req.claw_id, config)
    return {
        "user_id": result.user_id,
        "claw_id": result.claw_id,
        "service_name": result.service_name,
        "service_dns": result.service_dns,
        "gateway_port": result.gateway_port,
    }


@app.post("/deprovision", dependencies=[Depends(verify_key)])
async def deprovision(req: DeprovisionRequest):
    await claw.deprovision_claw(req.user_id, req.claw_id)
    return {"status": "deprovisioned", "user_id": req.user_id, "claw_id": req.claw_id}


@app.post("/deprovision-user", dependencies=[Depends(verify_key)])
async def deprovision_user(req: DeprovisionUserRequest):
    await claw.deprovision_user(req.user_id)
    return {"status": "deprovisioned", "user_id": req.user_id}
