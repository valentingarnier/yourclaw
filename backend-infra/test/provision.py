"""Provisioning test against a k3s cluster.

Prerequisites:
    - k3s cluster running (hetzner-k3s create --config infra/cluster.yaml)
    - KUBECONFIG pointing to the cluster kubeconfig

Usage:
    cd backend-infra
    KUBECONFIG=../infra/kubeconfig AI_GATEWAY_API_KEY=your-key uv run test/provision.py
"""

import os
import sys

from backend_infra.services.claw_client import ClawClient
from backend_infra.services.config_builder import (
    ChannelsConfig,
    GatewayConfig,
    ModelConfig,
    OpenclawConfig,
    ProviderKeys,
    TelegramChannelConfig,
)
from backend_infra.services.k8s_client import K8sClient
from dotenv import load_dotenv

load_dotenv()

USER_ID = "test-user-1"
CLAW_ID = "claw-1"
DATA_ROOT = "/data"

# Read keys from env
ai_gateway_key = os.environ.get("AI_GATEWAY_API_KEY", "")
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
telegram_allow_from = os.environ.get("TELEGRAM_ALLOW_FROM", "")
kubeconfig = os.environ.get("KUBECONFIG", "")

if not ai_gateway_key and not anthropic_key:
    print("Set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY env var")
    sys.exit(1)

if not kubeconfig:
    print("Set KUBECONFIG env var (e.g. KUBECONFIG=../infra/kubeconfig)")
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

k8s = K8sClient(kubeconfig_path=kubeconfig)
claw = ClawClient(k8s, data_root=DATA_ROOT)

# Clean up first
print(f"Deprovisioning {USER_ID} (clean slate)...")
claw.deprovision_user(USER_ID)
print("Done!")
print()

# Provision
print(f"Provisioning {USER_ID}/{CLAW_ID}...")
result = claw.provision_claw(USER_ID, CLAW_ID, config)
print(f"Done! {result}")
print()

# Check status
status = claw.get_claw_status(USER_ID, CLAW_ID)
print(f"Status: {status}")
print()

provider = "AI Gateway" if ai_gateway_key else "Anthropic direct"
print(f"Provider:  {provider}")
print(f"Service:   {result.service_dns}:{result.gateway_port}")
print(f"Telegram:  {'allowlist ' + str(allow_from) if telegram_bot_token else 'disabled'}")
print()
print("Verify with:")
print(f"  kubectl get deployment,service,configmap -l app=yourclaw,user-id={USER_ID}")
print(f"  kubectl logs deployment/{result.service_name}")
print()
print("Port-forward to test locally:")
print(f"  kubectl port-forward svc/{result.service_name} 19000:{result.gateway_port}")
print(f'  curl http://localhost:19000/v1/chat/completions -H "Authorization: Bearer test-token-local" -H "Content-Type: application/json" -d \'{{"model":"openclaw:main","messages":[{{"role":"user","content":"say hello"}}]}}\'')
print()
print("To clean up:")
print(f'  uv run python -c "from backend_infra.services.claw_client import ClawClient; from backend_infra.services.k8s_client import K8sClient; ClawClient(K8sClient(kubeconfig_path=\\"{kubeconfig}\\")).deprovision_user(\\"{USER_ID}\\")"')
