"""Local provisioning test with real API keys.

Prerequisites:
    cd infra/docker && ./build.sh

Usage:
    cd backend
    AI_GATEWAY_API_KEY=your-key uv run test/provision.py
"""

import os
import sys

from app.services.infra.claw_client import ClawClient
from app.services.infra.config_builder import (
    ChannelsConfig,
    GatewayConfig,
    ModelConfig,
    OpenclawConfig,
    ProviderKeys,
    TelegramChannelConfig,
)
from app.services.infra.infra_client import InfraClient
from dotenv import load_dotenv

load_dotenv()

USER_ID = "test-user-1"
CLAW_ID = "claw-1"
PORT = 19000
DATA_ROOT = "/tmp/yourclaw-data"

# Read keys from env
ai_gateway_key = os.environ.get("AI_GATEWAY_API_KEY", "")
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
telegram_allow_from = os.environ.get("TELEGRAM_ALLOW_FROM", "")  # comma-separated usernames

if not ai_gateway_key and not anthropic_key:
    print("Set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY env var")
    sys.exit(1)

# Telegram channel (optional)
channels = None
if telegram_bot_token:
    if not telegram_allow_from:
        print("TELEGRAM_ALLOW_FROM required when TELEGRAM_BOT_TOKEN is set")
        sys.exit(1)
    allow_from = [u.strip() for u in telegram_allow_from.split(",") if u.strip()]
    channels = ChannelsConfig(
        telegram=TelegramChannelConfig(
            bot_token=telegram_bot_token,
            allow_from=allow_from,
        ),
    )

config = OpenclawConfig(
    gateway=GatewayConfig(token="test-token-local"),
    model=ModelConfig(primary="openai/gpt-5.2-codex"),
    provider_keys=ProviderKeys(
        ai_gateway=ai_gateway_key,
        anthropic=anthropic_key,
    ),
    channels=channels,
)

infra = InfraClient.local()
claw = ClawClient(infra, data_root=DATA_ROOT)

# Clean up first
print(f"Deprovisioning {USER_ID} (clean slate)...")
claw.deprovision_user(USER_ID, "local")
print("Done!")
print()

# Provision
print(f"Provisioning {USER_ID}/{CLAW_ID} on port {PORT}...")
result = claw.provision_claw(USER_ID, CLAW_ID, config, port=PORT, worker_name="local")
print(f"Done! {result}")
print()

# Check status
status = claw.get_claw_status(USER_ID, CLAW_ID)
print(f"Status: {status}")
print()

provider = "AI Gateway" if ai_gateway_key else "Anthropic direct"
print(f"Provider:  {provider}")
print(f"Gateway:   http://localhost:{PORT}")
print(f"Telegram:  {'allowlist ' + str(allow_from) if telegram_bot_token else 'disabled'}")
print(f"Logs:      docker logs {result.container_name}")
print()
print("Test with:")
print(f'  curl http://localhost:{PORT}/v1/chat/completions -H "Authorization: Bearer test-token-local" -H "Content-Type: application/json" -d \'{{"model":"openclaw:main","messages":[{{"role":"user","content":"say hello"}}]}}\'')
print()
print("To clean up:")
print(f"  uv run python -c \"from app.services.infra.claw_client import ClawClient; from app.services.infra.infra_client import InfraClient; ClawClient(InfraClient.local(), data_root='{DATA_ROOT}').deprovision_user('{USER_ID}', 'local')\"")
