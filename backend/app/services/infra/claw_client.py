"""High-level client for provisioning OpenClaw instances.

Orchestrates InfraClient to manage networks, host directories, and containers.

Naming:
    container:  yourclaw-{user_id}-{claw_id}
    network:    yourclaw-net-{user_id}       (per-user, shared by all claws)
    host path:  {data_root}/{user_id}/{claw_id}/config/
                {data_root}/{user_id}/{claw_id}/workspace/
"""

import json
import logging
from dataclasses import dataclass

from app.services.infra.config_builder import (
    OpenclawConfig,
    build_env_vars,
    build_openclaw_json,
)
from app.services.infra.infra_client import InfraClient

logger = logging.getLogger("yourclaw.claw")

GATEWAY_IMAGE = "yourclaw-openclaw:latest"


# --- Output Dataclasses ---


@dataclass
class ProvisionResult:
    user_id: str
    claw_id: str
    worker_name: str
    container_name: str
    network_name: str
    port: int


@dataclass
class ClawStatus:
    user_id: str
    claw_id: str
    container_running: bool
    worker_name: str | None


# --- Naming ---


@dataclass
class _Names:
    container: str
    network: str
    config_dir: str
    workspace_dir: str
    claw_dir: str


def _names(user_id: str, claw_id: str, data_root: str) -> _Names:
    return _Names(
        container=f"yourclaw-{user_id}-{claw_id}",
        network=f"yourclaw-net-{user_id}",
        config_dir=f"{data_root}/{user_id}/{claw_id}/config",
        workspace_dir=f"{data_root}/{user_id}/{claw_id}/workspace",
        claw_dir=f"{data_root}/{user_id}/{claw_id}",
    )


# --- Client ---


class ClawClient:
    """Provisions and manages OpenClaw instances using InfraClient."""

    def __init__(self, infra: InfraClient, data_root: str = "/data"):
        """
        Args:
            infra: InfraClient for Docker operations.
            data_root: Root directory for persistent data on the host.
                       Production: /data (created by cloud-init on Hetzner volume).
                       Local testing: /tmp/yourclaw-data.
        """
        self._infra = infra
        self._data_root = data_root

    def provision_claw(
        self,
        user_id: str,
        claw_id: str,
        config: OpenclawConfig,
        port: int,
        worker_name: str | None = None,
    ) -> ProvisionResult:
        """Provision a full OpenClaw instance.

        Idempotent — tears down existing claw resources before creating new ones.
        Creates the user network if it doesn't exist.

        Args:
            user_id: User identifier.
            claw_id: Claw instance identifier (unique per user).
            config: OpenClaw configuration.
            port: Host port to expose the gateway on.
            worker_name: Target worker. If None, picks the least loaded.
        """
        n = _names(user_id, claw_id, self._data_root)

        # Pick worker if not specified
        if worker_name is None:
            worker = self._infra.pick_worker()
            worker_name = worker.name

        # Clean existing claw (idempotent)
        self._teardown_claw(worker_name, n)

        # 1. Ensure user network exists
        self._ensure_network(worker_name, n.network)

        # 2. Write config
        config_dict = build_openclaw_json(config)
        config_dict["agents"]["defaults"]["sandbox"]["docker"] = {
            "network": n.network,
        }
        self._infra.write_host_file(
            worker_name,
            n.config_dir,
            "openclaw.json",
            json.dumps(config_dict, indent=2),
        )

        # 3. Write system instructions
        if config.system_instructions:
            self._infra.write_host_file(
                worker_name,
                n.workspace_dir,
                "CLAUDE.md",
                config.system_instructions,
            )

        # 4. Start gateway
        env_vars = build_env_vars(config)
        self._infra.create_container(
            worker_name=worker_name,
            name=n.container,
            image=GATEWAY_IMAGE,
            ports={"18789/tcp": port},
            environment=env_vars,
            volumes={
                n.config_dir: {"bind": "/home/node/.openclaw", "mode": "rw"},
                n.workspace_dir: {
                    "bind": "/home/node/.openclaw/workspace",
                    "mode": "rw",
                },
                "/var/run/docker.sock": {
                    "bind": "/var/run/docker.sock",
                    "mode": "rw",
                },
            },
            network=n.network,
        )
        logger.info(
            f"Provisioned claw {claw_id} for user {user_id} on {worker_name} port {port}"
        )

        return ProvisionResult(
            user_id=user_id,
            claw_id=claw_id,
            worker_name=worker_name,
            container_name=n.container,
            network_name=n.network,
            port=port,
        )

    def deprovision_claw(
        self, user_id: str, claw_id: str, worker_name: str
    ) -> None:
        """Tear down a single claw instance. Leaves the user network intact."""
        n = _names(user_id, claw_id, self._data_root)
        self._teardown_claw(worker_name, n)
        logger.info(f"Deprovisioned claw {claw_id} for user {user_id}")

    def deprovision_user(self, user_id: str, worker_name: str) -> None:
        """Tear down ALL claws and the user network.

        Removes all containers matching yourclaw-{user_id}-* on the worker,
        the user network, and the user data directory.
        """
        # Find and remove all containers for this user
        prefix = f"yourclaw-{user_id}-"
        containers = self._infra.list_containers(worker_name)
        for c in containers:
            if c.name.startswith(prefix):
                self._infra.remove_container(c.name)

        # Remove network
        network_name = f"yourclaw-net-{user_id}"
        self._infra.remove_network(worker_name, network_name)

        # Remove all user data
        user_dir = f"{self._data_root}/{user_id}"
        self._infra.remove_host_dir(worker_name, user_dir)

        logger.info(f"Deprovisioned all claws for user {user_id}")

    def get_claw_status(self, user_id: str, claw_id: str) -> ClawStatus:
        """Check if a specific claw is running (searches all workers)."""
        container_name = f"yourclaw-{user_id}-{claw_id}"
        info = self._infra.find_container(container_name)

        if info is None:
            return ClawStatus(
                user_id=user_id,
                claw_id=claw_id,
                container_running=False,
                worker_name=None,
            )

        return ClawStatus(
            user_id=user_id,
            claw_id=claw_id,
            container_running=info.status == "running",
            worker_name=info.worker_name,
        )

    # --- Internal ---

    def _ensure_network(self, worker_name: str, network_name: str) -> None:
        """Create network if it doesn't already exist."""
        client = self._infra._get_client(worker_name)
        try:
            client.networks.get(network_name)
        except Exception:
            self._infra.create_network(worker_name, network_name)

    def _teardown_claw(self, worker_name: str, n: _Names) -> None:
        """Remove a single claw's container and data (silent if missing)."""
        self._infra.remove_container(n.container)
        self._infra.remove_host_dir(worker_name, n.claw_dir)
