from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""  # e.g. whatsapp:+14155238886

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""  # $20/month subscription

    # Hetzner Host Server
    host_server_ip: str = ""
    host_server_ssh_key_path: str = ""  # Local dev: path to SSH key file
    host_server_ssh_key: str = ""  # Production: SSH key content (for Render/Railway)

    # Shared LLM Key
    anthropic_api_key: str = ""

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

    # Worker
    worker_poll_interval: int = 5
    worker_max_attempts: int = 3

    # Mock Mode
    mock_twilio: bool = False
    mock_containers: bool = False
    mock_stripe: bool = False
    skip_twilio_signature: bool = False  # Skip signature validation for dev/ngrok

    # Dev Mode
    dev_user_id: str = ""  # Set to bypass auth for testing

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
