import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- User ---

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None = None
    subscription_status: str | None = None  # ACTIVE, PAST_DUE, CANCELED, or None
    assistant_status: str | None = None  # NONE, PROVISIONING, READY, ERROR


class PhoneInput(BaseModel):
    phone: str = Field(..., pattern=r"^\+[1-9]\d{1,14}$", description="E.164 format phone number")


# --- Assistant ---

class AssistantResponse(BaseModel):
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssistantCreateResponse(BaseModel):
    status: str  # PROVISIONING


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
