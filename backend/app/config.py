from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""  # $20/month subscription

    # Shared LLM Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    # Web Search (Brave Search API)
    brave_api_key: str = ""  # For OpenClaw web search tool

    # Google OAuth (for integrations: Calendar, Gmail, Drive)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Security
    encryption_key: str = ""  # Fernet key

    # App URLs
    api_url: str = "http://localhost:8000"
    app_url: str = "http://localhost:3000"
    marketing_url: str = "http://localhost:3001"

    # Rate Limits
    rate_limit_msg_per_min: int = 5
    rate_limit_msg_per_day: int = 100

    # Email (Resend)
    resend_api_key: str = ""

    # Infra API (separate provisioning service)
    infra_api_url: str = "https://infra.api.yourclaw.dev"
    yourclaw_api_key: str = ""  # Bearer token for infra API

    # Mock Mode
    mock_containers: bool = False
    mock_stripe: bool = False

    # Dev Mode
    dev_user_id: str = ""  # Set to bypass auth for testing

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
