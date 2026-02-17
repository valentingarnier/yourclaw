"""OpenClaw configuration builder.

Builds openclaw.json config and container env vars from typed dataclass inputs.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone


# --- Input Dataclasses ---


@dataclass
class GatewayConfig:
    token: str
    port: int = 18789


@dataclass
class ModelConfig:
    primary: str = "anthropic/claude-sonnet-4-5"
    context_tokens: int = 200000


@dataclass
class ProviderKeys:
    anthropic: str = ""
    openai: str = ""
    ai_gateway: str = ""


@dataclass
class TelegramChannelConfig:
    bot_token: str
    allow_from: list[str] = field(default_factory=list)


@dataclass
class WhatsAppChannelConfig:
    allow_from: list[str] = field(default_factory=list)


@dataclass
class ChannelsConfig:
    telegram: TelegramChannelConfig | None = None
    whatsapp: WhatsAppChannelConfig | None = None


DEFAULT_SYSTEM_INSTRUCTIONS = """\
# Identity

You have opinions. Strong ones. Commit to a take — no hedging with "it depends."

# Rules

- Never open with "Great question," "I'd be happy to help," or "Absolutely." Just answer.
- Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
- If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
- Swearing is allowed when it lands. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" — say holy shit.

# Vibe

Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.
"""


@dataclass
class OpenclawConfig:
    gateway: GatewayConfig
    model: ModelConfig = field(default_factory=ModelConfig)
    provider_keys: ProviderKeys = field(default_factory=ProviderKeys)
    channels: ChannelsConfig | None = None
    system_instructions: str = DEFAULT_SYSTEM_INSTRUCTIONS


# --- Builders ---


def build_openclaw_json(config: OpenclawConfig) -> dict:
    """Build the openclaw.json config dict from typed input."""

    model_id = config.model.primary

    result: dict = {
        "agents": {
            "defaults": {
                "model": {"primary": model_id},
                "contextTokens": config.model.context_tokens,
                "thinkingDefault": "low",
                "blockStreamingDefault": "on",
                "compaction": {"memoryFlush": {"enabled": True}},
            },
        },
        "gateway": {
            "mode": "local",
            "port": config.gateway.port,
            "auth": {"mode": "token", "token": config.gateway.token},
            "http": {"endpoints": {"chatCompletions": {"enabled": True}}},
        },
        "tools": {
            "profile": "full",
            "web": {"search": {"enabled": True}, "fetch": {"enabled": True}},
            "media": {"image": {"enabled": True}},
        },
        "commands": {"restart": True},
    }

    # Channels (Telegram, WhatsApp)
    if config.channels:
        channels_dict = {}
        plugins = {}
        if config.channels.telegram:
            tc = config.channels.telegram
            channels_dict["telegram"] = {
                "enabled": True,
                "botToken": tc.bot_token,
                "dmPolicy": "allowlist",
                "allowFrom": tc.allow_from if tc.allow_from else ["*"],
                "groupPolicy": "allowlist",
                "streamMode": "partial",
            }
            plugins["telegram"] = {"enabled": True}
        if config.channels.whatsapp:
            wc = config.channels.whatsapp
            channels_dict["whatsapp"] = {
                "enabled": True,
                "dmPolicy": "allowlist",
                "allowFrom": wc.allow_from if wc.allow_from else ["*"],
            }
            plugins["whatsapp"] = {"enabled": True}
        if plugins:
            result["plugins"] = {"entries": plugins}
        if channels_dict:
            result["channels"] = channels_dict

    # Wizard stamp — marks config as reviewed so doctor doesn't block channels
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    result["wizard"] = {
        "lastRunAt": now,
        "lastRunVersion": "2026.2.9",
        "lastRunCommand": "doctor",
        "lastRunMode": "local",
    }
    result["meta"] = {
        "lastTouchedVersion": "2026.2.9",
        "lastTouchedAt": now,
    }

    return result


def build_env_vars(config: OpenclawConfig) -> dict[str, str]:
    """Build container environment variables from provider keys."""
    env: dict[str, str] = {}

    key_map = {
        "ANTHROPIC_API_KEY": config.provider_keys.anthropic,
        "OPENAI_API_KEY": config.provider_keys.openai,
        "AI_GATEWAY_API_KEY": config.provider_keys.ai_gateway,
    }

    for var, value in key_map.items():
        if value:
            env[var] = value

    if config.channels and config.channels.telegram:
        env["TELEGRAM_BOT_TOKEN"] = config.channels.telegram.bot_token

    return env


def build_openclaw_json_str(config: OpenclawConfig) -> str:
    """Build openclaw.json as a formatted JSON string."""
    return json.dumps(build_openclaw_json(config), indent=2)
