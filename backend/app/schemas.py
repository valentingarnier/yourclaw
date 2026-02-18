import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


# --- User ---

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None = None
    channel: str | None = None  # WHATSAPP or TELEGRAM
    telegram_connected: bool = False  # True if telegram_chat_id is set
    subscription_status: str | None = None  # ACTIVE, PAST_DUE, CANCELED, or None
    assistant_status: str | None = None  # NONE, PROVISIONING, READY, ERROR


class PhoneInput(BaseModel):
    phone: str = Field(..., pattern=r"^\+[1-9]\d{1,14}$", description="E.164 format phone number")


class ChannelInput(BaseModel):
    channel: str = Field("WHATSAPP", pattern=r"^(WHATSAPP|TELEGRAM)$")
    phone: str | None = Field(None, pattern=r"^\+[1-9]\d{1,14}$", description="E.164 format, required for WHATSAPP")
    telegram_username: str | None = Field(None, description="Telegram username (without @), used for allowFrom")

    @model_validator(mode="after")
    def validate_channel_fields(self):
        if self.channel == "TELEGRAM" and not self.telegram_username:
            raise ValueError("Telegram username required for Telegram channel")
        if self.channel == "WHATSAPP" and not self.phone:
            raise ValueError("Phone number (E.164) required for WhatsApp channel")
        return self


# --- Assistant ---

# Available models for user selection
AVAILABLE_MODELS = [
    # OpenAI
    "openai/gpt-5.2-codex",
    "openai/gpt-5-mini",
    # Anthropic
    "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-haiku-4-5",
    # Vercel AI Gateway (cheap alternative models)
    "deepseek/deepseek-v3.2",
    "minimax/minimax-m2.1",
    "moonshotai/kimi-k2.5",
]
DEFAULT_MODEL = "openai/gpt-5.2-codex"


class AssistantResponse(BaseModel):
    status: str
    model: str = DEFAULT_MODEL
    channel: str | None = None
    claw_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssistantCreateInput(BaseModel):
    model: str = Field(default=DEFAULT_MODEL, description="OpenClaw model identifier")
    channel: str = Field(default="TELEGRAM", pattern=r"^(WHATSAPP|TELEGRAM)$", description="Messaging channel")
    telegram_bot_token: str | None = Field(None, description="Per-user Telegram bot token from @BotFather")
    telegram_username: str | None = Field(None, description="Telegram username for allowFrom (without @)")


class AssistantUpdateInput(BaseModel):
    model: str = Field(..., description="OpenClaw model identifier")


class AssistantCreateResponse(BaseModel):
    status: str  # READY or ERROR
    model: str = DEFAULT_MODEL
    channel: str | None = None
    claw_id: str | None = None


# --- Checkout / Subscription ---

class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionResponse(BaseModel):
    status: str  # ACTIVE, PAST_DUE, CANCELED
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    plan_name: str = "YourClaw Pro"
    price: str = "$20/month"
    trial_end: datetime | None = None


class CancelResponse(BaseModel):
    status: str  # "scheduled"
    cancels_at: str | None = None


# --- API Keys (BYOK) ---

class ApiKeyInput(BaseModel):
    provider: str = "ANTHROPIC"
    key: str = Field(..., min_length=10)


class ApiKeyResponse(BaseModel):
    provider: str
    created_at: datetime
    has_key: bool = True  # never expose the actual key


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


# --- Integrations (Google Calendar, Gmail, Drive) ---

class IntegrationInfo(BaseModel):
    email: str | None = None
    connected_at: datetime | None = None


class IntegrationsResponse(BaseModel):
    google_calendar: IntegrationInfo | None = None
    google_gmail: IntegrationInfo | None = None
    google_drive: IntegrationInfo | None = None


class ConnectResponse(BaseModel):
    auth_url: str


class DisconnectResponse(BaseModel):
    status: str  # "disconnected"
    service: str


# --- Errors ---

class ErrorResponse(BaseModel):
    detail: str
    code: str | None = None
