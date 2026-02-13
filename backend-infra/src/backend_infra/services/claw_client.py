"""High-level client for provisioning OpenClaw instances on k3s.

Orchestrates K8sClient to manage ConfigMaps, Deployments, and Services.

Naming:
    deployment:  claw-{user_id}-{claw_id}
    service:     claw-{user_id}-{claw_id}   (ClusterIP, port 18789)
    configmap:   claw-{user_id}-{claw_id}
    host path:   /data/{user_id}/{claw_id}/workspace/
"""

import json
import logging
from dataclasses import dataclass

from backend_infra.services.config_builder import (
    OpenclawConfig,
    build_env_vars,
    build_openclaw_json,
)
from backend_infra.services.k8s_client import K8sClient

logger = logging.getLogger("yourclaw.claw")

GATEWAY_IMAGE = "bitswired/yourclaw-openclaw:latest"
GATEWAY_PORT = 18789
IMAGE_PULL_SECRETS = ["dockerhub"]


# --- Output Dataclasses ---


@dataclass
class ProvisionResult:
    user_id: str
    claw_id: str
    service_name: str        # claw-{user_id}-{claw_id}
    service_dns: str         # claw-x-y.default.svc.cluster.local
    gateway_port: int        # always 18789


@dataclass
class ClawStatus:
    user_id: str
    claw_id: str
    ready: bool
    pod_phase: str | None
    node_name: str | None
    pod_ip: str | None


# --- Naming ---


def _resource_name(user_id: str, claw_id: str) -> str:
    return f"claw-{user_id}-{claw_id}"


def _labels(user_id: str, claw_id: str) -> dict[str, str]:
    return {
        "app": "yourclaw",
        "component": "claw",
        "user-id": user_id,
        "claw-id": claw_id,
    }


# --- Client ---


class ClawClient:
    """Provisions and manages OpenClaw instances on k3s via K8sClient."""

    def __init__(self, k8s: K8sClient, data_root: str = "/data"):
        self._k8s = k8s
        self._data_root = data_root

    def provision_claw(
        self,
        user_id: str,
        claw_id: str,
        config: OpenclawConfig,
    ) -> ProvisionResult:
        """Provision a full OpenClaw instance on k3s.

        Idempotent — replaces existing resources if they exist.

        Creates:
            1. ConfigMap with openclaw.json + SOUL.md
            2. Deployment (1 replica, nodeSelector: role=agent)
            3. ClusterIP Service on port 18789
        """
        name = _resource_name(user_id, claw_id)
        labels = _labels(user_id, claw_id)
        workspace_host = f"{self._data_root}/{user_id}/{claw_id}/workspace"

        # 1. Build config
        config_dict = build_openclaw_json(config)
        config_dict["browser"] = {
            "enabled": True,
            "attachOnly": True,
            "defaultProfile": "openclaw",
            "remoteCdpTimeoutMs": 2000,
            "remoteCdpHandshakeTimeoutMs": 4000,
            "profiles": {"openclaw": {
                "cdpUrl": "http://browser:3000?stealth=true&headless=false",
                "color": "#00AA00",
            }},
        }

        # 2. Create ConfigMap
        cm_data = {
            "openclaw.json": json.dumps(config_dict, indent=2),
        }
        if config.system_instructions:
            cm_data["SOUL.md"] = config.system_instructions

        self._k8s.create_configmap(name, data=cm_data, labels=labels)

        # 3. Create Deployment
        env_vars = build_env_vars(config)
        configmap_items = [
            {
                "key": "openclaw.json",
                "path": "openclaw.json",
                "mount_path": "/home/node/.openclaw/openclaw.json",
            },
        ]
        if config.system_instructions:
            configmap_items.append({
                "key": "SOUL.md",
                "path": "SOUL.md",
                "mount_path": "/home/node/.openclaw/workspace/SOUL.md",
            })

        self._k8s.create_deployment(
            name=name,
            image=GATEWAY_IMAGE,
            port=GATEWAY_PORT,
            env=env_vars,
            configmap_name=name,
            configmap_items=configmap_items,
            host_volumes={
                workspace_host: "/home/node/.openclaw/workspace",
            },
            node_selector={"role": "agent"},
            labels=labels,
            image_pull_secrets=IMAGE_PULL_SECRETS,
        )

        # 4. Create Service (ClusterIP, port 18789)
        self._k8s.create_service(
            name=name,
            selector_labels={"app-component": name},
            port=GATEWAY_PORT,
            target_port=GATEWAY_PORT,
        )

        service_dns = f"{name}.default.svc.cluster.local"
        logger.info(f"Provisioned claw {claw_id} for user {user_id} at {service_dns}")

        return ProvisionResult(
            user_id=user_id,
            claw_id=claw_id,
            service_name=name,
            service_dns=service_dns,
            gateway_port=GATEWAY_PORT,
        )

    def deprovision_claw(self, user_id: str, claw_id: str) -> None:
        """Tear down a single claw instance."""
        name = _resource_name(user_id, claw_id)
        self._k8s.delete_all(name)
        logger.info(f"Deprovisioned claw {claw_id} for user {user_id}")

    def deprovision_user(self, user_id: str) -> None:
        """Tear down ALL claws for a user."""
        deployments = self._k8s.list_deployments(f"app=yourclaw,user-id={user_id}")
        for dep in deployments:
            self._k8s.delete_all(dep.name)
        logger.info(f"Deprovisioned all claws for user {user_id}")

    def get_claw_status(self, user_id: str, claw_id: str) -> ClawStatus:
        """Check if a specific claw is running."""
        name = _resource_name(user_id, claw_id)
        status = self._k8s.get_deployment_status(name)

        if status is None:
            return ClawStatus(
                user_id=user_id,
                claw_id=claw_id,
                ready=False,
                pod_phase=None,
                node_name=None,
                pod_ip=None,
            )

        return ClawStatus(
            user_id=user_id,
            claw_id=claw_id,
            ready=status.ready,
            pod_phase=status.pod_phase,
            node_name=status.node_name,
            pod_ip=status.pod_ip,
        )

    def update_claw_config(
        self,
        user_id: str,
        claw_id: str,
        config: OpenclawConfig,
    ) -> None:
        """Update ConfigMap with new config. Pod restarts to pick up changes."""
        name = _resource_name(user_id, claw_id)

        config_dict = build_openclaw_json(config)
        config_dict["browser"] = {
            "enabled": True,
            "attachOnly": True,
            "defaultProfile": "openclaw",
            "remoteCdpTimeoutMs": 2000,
            "remoteCdpHandshakeTimeoutMs": 4000,
            "profiles": {"openclaw": {
                "cdpUrl": "http://browser:3000?stealth=true&headless=false",
                "color": "#00AA00",
            }},
        }

        cm_data = {
            "openclaw.json": json.dumps(config_dict, indent=2),
        }
        if config.system_instructions:
            cm_data["SOUL.md"] = config.system_instructions

        self._k8s.update_configmap(name, data=cm_data)
        logger.info(f"Updated config for claw {claw_id} user {user_id}")
