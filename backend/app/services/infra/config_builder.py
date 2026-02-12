"""OpenClaw configuration builder.

Builds openclaw.json config and container env vars from typed dataclass inputs.
"""

import json
from dataclasses import dataclass, field


# --- Input Dataclasses ---


@dataclass
class GatewayConfig:
    token: str
    port: int = 18789


@dataclass
class ModelConfig:
    primary: str = "anthropic/claude-sonnet-4-5-20250929"
    context_tokens: int = 200000


@dataclass
class ProviderKeys:
    anthropic: str = ""
    openai: str = ""
    google: str = ""
    ai_gateway: str = ""
    brave: str = ""


@dataclass
class BrowserSandboxConfig:
    enabled: bool = True
    image: str = "openclaw-sandbox-browser:bookworm-slim"
    headless: bool = False


@dataclass
class McpServer:
    name: str
    command: str
    args: list[str] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)


@dataclass
class OpenclawConfig:
    gateway: GatewayConfig
    model: ModelConfig = field(default_factory=ModelConfig)
    provider_keys: ProviderKeys = field(default_factory=ProviderKeys)
    browser: BrowserSandboxConfig = field(default_factory=BrowserSandboxConfig)
    mcp_servers: list[McpServer] = field(default_factory=list)
    system_instructions: str = ""


# --- Builders ---


def build_openclaw_json(config: OpenclawConfig) -> dict:
    """Build the openclaw.json config dict from typed input."""

    # Prefix model with vercel-ai-gateway/ when using AI Gateway
    model_id = config.model.primary
    if config.provider_keys.ai_gateway and not model_id.startswith("vercel-ai-gateway/"):
        model_id = f"vercel-ai-gateway/{model_id}"

    result: dict = {
        "agents": {
            "defaults": {
                "model": {"primary": model_id},
                "contextTokens": config.model.context_tokens,
                "thinkingDefault": "low",
                "blockStreamingDefault": "on",
                "compaction": {"memoryFlush": {"enabled": True}},
                "sandbox": {
                    "browser": {
                        "enabled": config.browser.enabled,
                        "image": config.browser.image,
                        "headless": config.browser.headless,
                    },
                },
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

    # MCP servers (Google integrations, etc.)
    if config.mcp_servers:
        mcp = {}
        for server in config.mcp_servers:
            entry: dict = {
                "command": server.command,
                "args": server.args,
            }
            if server.env:
                entry["env"] = server.env
            mcp[server.name] = entry
        result["mcpServers"] = mcp

    return result


def build_env_vars(config: OpenclawConfig) -> dict[str, str]:
    """Build container environment variables from provider keys."""
    env: dict[str, str] = {}

    key_map = {
        "ANTHROPIC_API_KEY": config.provider_keys.anthropic,
        "OPENAI_API_KEY": config.provider_keys.openai,
        "GOOGLE_API_KEY": config.provider_keys.google,
        "AI_GATEWAY_API_KEY": config.provider_keys.ai_gateway,
        "BRAVE_API_KEY": config.provider_keys.brave,
    }

    for var, value in key_map.items():
        if value:
            env[var] = value

    return env


def build_openclaw_json_str(config: OpenclawConfig) -> str:
    """Build openclaw.json as a formatted JSON string."""
    return json.dumps(build_openclaw_json(config), indent=2)
