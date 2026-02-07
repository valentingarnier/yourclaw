"""Docker container lifecycle management on remote host server.

Handles SSH connection to host, container creation, health checks, and cleanup.
"""

import asyncio
import copy
import json
import logging
import uuid

import paramiko

from app.config import settings

logger = logging.getLogger("yourclaw.container")

# Openclaw config template
OPENCLAW_CONFIG_TEMPLATE = {
    "agents": {
        "defaults": {
            "model": {
                "primary": "anthropic/claude-sonnet-4-5-20250929"
            }
        }
    },
    "gateway": {
        "mode": "local",
        "port": 18789,
        "auth": {
            "mode": "token",
            "token": ""  # filled per-user
        },
        "http": {
            "endpoints": {
                "chatCompletions": {"enabled": True}
            }
        }
    }
}

# MCP server configs for each Google service
# Tokens are injected at runtime via environment variables
MCP_SERVER_CONFIGS = {
    "GOOGLE_CALENDAR": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-google-calendar"],
        "env": {
            "GOOGLE_ACCESS_TOKEN": "${GOOGLE_CALENDAR_TOKEN}"
        }
    },
    "GOOGLE_GMAIL": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-gmail"],
        "env": {
            "GOOGLE_ACCESS_TOKEN": "${GOOGLE_GMAIL_TOKEN}"
        }
    },
    "GOOGLE_DRIVE": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-google-drive"],
        "env": {
            "GOOGLE_ACCESS_TOKEN": "${GOOGLE_DRIVE_TOKEN}"
        }
    },
}

# System instructions for the Openclaw assistant (written to CLAUDE.md in workspace)
OPENCLAW_SYSTEM_INSTRUCTIONS = """# YourClaw Assistant

You are a personal AI assistant running on YourClaw, deployed via WhatsApp. YourClaw is simplifying the deployment of OpenClaw for non techical users.

## Important Context
- You are ALREADY connected to WhatsApp. The user is messaging you through WhatsApp right now.
- Do NOT suggest connecting to WhatsApp, Telegram, or other messaging apps - you're already there.
- Do NOT mention terminals, CLI, or technical setup - the user interacts with you only via chat.
"""


class ContainerService:
    """Manages Openclaw containers on remote Docker host."""

    def __init__(self, host_ip: str, ssh_key_path: str):
        self.host_ip = host_ip
        self.ssh_key_path = ssh_key_path

    def _get_ssh_client(self) -> paramiko.SSHClient:
        """Create SSH client connected to host server."""
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=self.host_ip,
            username="root",
            key_filename=self.ssh_key_path,
            timeout=30,
        )
        return client

    def _exec_command(self, client: paramiko.SSHClient, command: str) -> tuple[str, str, int]:
        """Execute command and return stdout, stderr, exit code."""
        stdin, stdout, stderr = client.exec_command(command, timeout=120)
        exit_code = stdout.channel.recv_exit_status()
        return stdout.read().decode(), stderr.read().decode(), exit_code

    async def create_container(
        self,
        user_id: str,
        port: int,
        gateway_token: str,
        anthropic_api_key: str,
        integrations: dict[str, str] | None = None,
    ) -> str:
        """Create and start an Openclaw container for a user.

        Args:
            user_id: User's UUID
            port: Host port to map (e.g., 19001)
            gateway_token: Auth token for Openclaw gateway
            anthropic_api_key: Anthropic API key (shared or BYOK)
            integrations: Dict of service -> access_token for MCP servers
                          e.g. {"GOOGLE_CALENDAR": "ya29...", "GOOGLE_GMAIL": "ya29..."}

        Returns:
            Container ID
        """
        if settings.mock_containers:
            logger.info(f"[Mock] Creating container for user {user_id} on port {port}")
            await asyncio.sleep(2)  # Simulate provisioning time
            return f"mock-container-{user_id[:8]}"

        container_name = f"yourclaw-{user_id}"
        config_dir = f"/data/yourclaw/{user_id}/config"
        workspace_dir = f"/data/yourclaw/{user_id}/workspace"

        # Generate Openclaw config
        config = copy.deepcopy(OPENCLAW_CONFIG_TEMPLATE)
        config["gateway"]["auth"]["token"] = gateway_token

        # Add MCP servers for connected integrations
        if integrations:
            mcp_servers = {}
            for service, token in integrations.items():
                if service in MCP_SERVER_CONFIGS:
                    # Copy config and inject token directly (not via env var reference)
                    server_config = copy.deepcopy(MCP_SERVER_CONFIGS[service])
                    # Replace env var placeholder with actual token
                    env_key = list(server_config["env"].keys())[0]
                    server_config["env"][env_key] = token
                    mcp_servers[service.lower().replace("_", "-")] = server_config
                    logger.info(f"Adding MCP server: {service} for user {user_id}")

            if mcp_servers:
                config["mcpServers"] = mcp_servers

        client = self._get_ssh_client()
        try:
            # Create directories
            self._exec_command(client, f"mkdir -p {config_dir} {workspace_dir}")

            # Write config file
            config_json = json.dumps(config, indent=2)
            self._exec_command(
                client,
                f"cat > {config_dir}/openclaw.json << 'EOF'\n{config_json}\nEOF"
            )

            # Write CLAUDE.md system instructions to workspace
            self._exec_command(
                client,
                f"cat > {workspace_dir}/CLAUDE.md << 'EOF'\n{OPENCLAW_SYSTEM_INSTRUCTIONS}\nEOF"
            )

            # Stop existing container if any
            self._exec_command(client, f"docker rm -f {container_name} 2>/dev/null || true")

            # Run container
            # Use node:22-bookworm (not slim) because openclaw needs git
            # Mount config to /root/.openclaw (includes workspace subfolder)
            # Openclaw writes to /root/.openclaw/workspace/ by default
            docker_cmd = f"""docker run -d \
                --name {container_name} \
                --restart unless-stopped \
                -p {port}:18789 \
                --memory=2g \
                --cpus=1 \
                -e ANTHROPIC_API_KEY={anthropic_api_key} \
                -v {config_dir}:/root/.openclaw \
                -v {workspace_dir}:/root/.openclaw/workspace \
                node:22-bookworm \
                bash -c "npm i -g openclaw && openclaw gateway --port 18789 --bind lan"
            """

            stdout, stderr, exit_code = self._exec_command(client, docker_cmd)

            if exit_code != 0:
                logger.error(f"Docker run failed: {stderr}")
                raise Exception(f"Failed to create container: {stderr}")

            container_id = stdout.strip()
            logger.info(f"Created container {container_id} for user {user_id}")
            return container_id

        finally:
            client.close()

    async def health_check(self, port: int, gateway_token: str, retries: int = 20, delay: int = 10) -> bool:
        """Check if Openclaw container is healthy and responding.

        Args:
            port: Host port where container is mapped
            gateway_token: Auth token for API call
            retries: Number of retry attempts
            delay: Seconds between retries

        Returns:
            True if healthy, False otherwise
        """
        if settings.mock_containers:
            logger.info(f"[Mock] Health check for port {port}")
            await asyncio.sleep(1)
            return True

        import httpx

        url = f"http://{self.host_ip}:{port}/v1/chat/completions"
        headers = {"Authorization": f"Bearer {gateway_token}"}
        payload = {
            "model": "openclaw:main",
            "messages": [{"role": "user", "content": "ping"}],
        }

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        logger.info(f"Health check passed on port {port}")
                        return True
                    logger.warning(f"Health check attempt {attempt + 1}: status {resp.status_code}")
            except Exception as e:
                logger.warning(f"Health check attempt {attempt + 1}: {e}")

            if attempt < retries - 1:
                await asyncio.sleep(delay)

        logger.error(f"Health check failed after {retries} attempts")
        return False

    async def stop_container(self, user_id: str) -> bool:
        """Stop and remove a user's container.

        Args:
            user_id: User's UUID

        Returns:
            True if successful
        """
        if settings.mock_containers:
            logger.info(f"[Mock] Stopping container for user {user_id}")
            return True

        container_name = f"yourclaw-{user_id}"

        client = self._get_ssh_client()
        try:
            stdout, stderr, exit_code = self._exec_command(
                client,
                f"docker rm -f {container_name}"
            )

            if exit_code != 0 and "No such container" not in stderr:
                logger.error(f"Failed to stop container: {stderr}")
                return False

            logger.info(f"Stopped container for user {user_id}")
            return True

        finally:
            client.close()

    async def get_container_status(self, user_id: str) -> str | None:
        """Get container status.

        Returns:
            "running", "exited", or None if not found
        """
        if settings.mock_containers:
            return "running"

        container_name = f"yourclaw-{user_id}"

        client = self._get_ssh_client()
        try:
            stdout, stderr, exit_code = self._exec_command(
                client,
                f"docker inspect -f '{{{{.State.Status}}}}' {container_name} 2>/dev/null"
            )

            if exit_code != 0:
                return None

            return stdout.strip()

        finally:
            client.close()

    async def allocate_port(self, existing_ports: list[int]) -> int:
        """Allocate next available port starting from 19000.

        Args:
            existing_ports: List of already allocated ports

        Returns:
            Next available port
        """
        base_port = 19000
        used = set(existing_ports)

        for port in range(base_port, base_port + 1000):
            if port not in used:
                return port

        raise Exception("No available ports")

    async def update_config(
        self,
        user_id: str,
        gateway_token: str,
        integrations: dict[str, str] | None = None,
    ) -> bool:
        """Update Openclaw config and restart container.

        Used when user connects/disconnects integrations.

        Args:
            user_id: User's UUID
            gateway_token: Auth token for Openclaw gateway
            integrations: Dict of service -> access_token for MCP servers

        Returns:
            True if successful
        """
        if settings.mock_containers:
            logger.info(f"[Mock] Updating config for user {user_id}")
            return True

        container_name = f"yourclaw-{user_id}"
        config_dir = f"/data/yourclaw/{user_id}/config"

        # Generate updated config
        config = copy.deepcopy(OPENCLAW_CONFIG_TEMPLATE)
        config["gateway"]["auth"]["token"] = gateway_token

        # Add MCP servers for connected integrations
        if integrations:
            mcp_servers = {}
            for service, token in integrations.items():
                if service in MCP_SERVER_CONFIGS:
                    server_config = copy.deepcopy(MCP_SERVER_CONFIGS[service])
                    env_key = list(server_config["env"].keys())[0]
                    server_config["env"][env_key] = token
                    mcp_servers[service.lower().replace("_", "-")] = server_config

            if mcp_servers:
                config["mcpServers"] = mcp_servers

        client = self._get_ssh_client()
        try:
            # Write updated config
            config_json = json.dumps(config, indent=2)
            self._exec_command(
                client,
                f"cat > {config_dir}/openclaw.json << 'EOF'\n{config_json}\nEOF"
            )

            # Restart container to pick up new config
            stdout, stderr, exit_code = self._exec_command(
                client,
                f"docker restart {container_name}"
            )

            if exit_code != 0:
                logger.error(f"Container restart failed: {stderr}")
                return False

            logger.info(f"Updated config and restarted container for user {user_id}")
            return True

        finally:
            client.close()


# Singleton instance
container_service = ContainerService(
    host_ip=settings.host_server_ip,
    ssh_key_path=settings.host_server_ssh_key_path,
)
