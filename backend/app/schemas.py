import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


# --- User ---

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None = None
    channel: str | None = None  # WHATSAPP or TELEGRAM
    telegram_username: str | None = None
    telegram_connected: bool = False  # True if telegram_chat_id is set
    subscription_status: str | None = None  # ACTIVE, PAST_DUE, CANCELED, or None
    assistant_status: str | None = None  # NONE, PROVISIONING, READY, ERROR


class PhoneInput(BaseModel):
    phone: str = Field(..., pattern=r"^\+[1-9]\d{1,14}$", description="E.164 format phone number")


class ChannelInput(BaseModel):
    channel: str = Field("WHATSAPP", pattern=r"^(WHATSAPP|TELEGRAM)$")
    phone: str | None = Field(None, pattern=r"^\+[1-9]\d{1,14}$", description="E.164 format, required for WHATSAPP")
    telegram_username: str | None = Field(None, description="Telegram username, required for TELEGRAM")

    @model_validator(mode="after")
    def validate_channel_fields(self):
        if self.channel == "WHATSAPP" and not self.phone:
            raise ValueError("Phone number required for WhatsApp channel")
        if self.channel == "TELEGRAM" and not self.telegram_username:
            raise ValueError("Telegram username required for Telegram channel")
        return self


# --- Assistant ---

# Available models for user selection
AVAILABLE_MODELS = [
    # Anthropic
    "anthropic/claude-sonnet-4-5-20250929",
    "anthropic/claude-opus-4-5-20251101",
    "anthropic/claude-haiku-4-5-20251001",
    # OpenAI
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    # Google
    "google/gemini-2.0-flash",
    "google/gemini-2.0-flash-lite",
]
DEFAULT_MODEL = "anthropic/claude-sonnet-4-5-20250929"


class AssistantResponse(BaseModel):
    status: str
    model: str = DEFAULT_MODEL
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssistantCreateInput(BaseModel):
    model: str = Field(default=DEFAULT_MODEL, description="OpenClaw model identifier")


class AssistantUpdateInput(BaseModel):
    model: str = Field(..., description="OpenClaw model identifier")


class AssistantCreateResponse(BaseModel):
    status: str  # PROVISIONING
    model: str = DEFAULT_MODEL


# --- Checkout / Subscription ---

class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionResponse(BaseModel):
    status: str  # ACTIVE, PAST_DUE, CANCELED
    credits_remaining_cents: int
    current_period_end: datetime | None = None


# --- API Keys (BYOK) ---

class ApiKeyInput(BaseModel):
    provider: str = "ANTHROPIC"
    key: str = Field(..., min_length=10)


class ApiKeyResponse(BaseModel):
    provider: str
    created_at: datetime
    has_key: bool = True  # never expose the actual key


# --- Usage ---

class UsageDayResponse(BaseModel):
    date: str
    inbound_count: int
    outbound_count: int


class UsageResponse(BaseModel):
    today: UsageDayResponse
    credits_used_cents: int
    credits_total_cents: int


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
