"""High-level client for provisioning OpenClaw instances on Kubernetes.

Orchestrates kr8s to manage per-claw resources:
    ConfigMap, Secret, PVC, Deployment, Service, CiliumNetworkPolicy

Naming:
    All resources:  claw-{user_id}-{claw_id}

Labels (on every resource):
    app: yourclaw
    user-id: <user_id>
    claw-id: <claw_id>

Cleanup:
    By claw:  kubectl delete all,cm,secret,pvc,ciliumnetworkpolicy -l claw-id=X
    By user:  kubectl delete all,cm,secret,pvc,ciliumnetworkpolicy -l user-id=Y
"""

import logging
from dataclasses import dataclass

import kr8s
from kr8s.asyncio.objects import (
    ConfigMap,
    Deployment,
    Secret,
    Service,
    new_class,
)

from .config_builder import OpenclawConfig, build_env_vars, build_openclaw_json_str

logger = logging.getLogger("yourclaw.claw")

PersistentVolumeClaim = new_class("PersistentVolumeClaim", "v1", namespaced=True)
CiliumNetworkPolicy = new_class("CiliumNetworkPolicy", "cilium.io/v2", namespaced=True, plural="ciliumnetworkpolicies")

GATEWAY_IMAGE = "bitswired/yourclaw-openclaw:latest"
GATEWAY_PORT = 18789
IMAGE_PULL_SECRETS = ["dockerhub"]
NAMESPACE = "default"
STORAGE_CLASS = "hcloud-volumes"
WORKSPACE_SIZE = "10Gi"

# All resource types managed per claw (order: workloads first, storage last)
CLAW_RESOURCES = (
    Deployment, Service, CiliumNetworkPolicy,
    ConfigMap, Secret, PersistentVolumeClaim,
)


# --- Output Dataclasses ---


@dataclass
class ProvisionResult:
    user_id: str
    claw_id: str
    service_name: str       # claw-{user_id}-{claw_id}
    service_dns: str        # claw-x-y.default.svc.cluster.local
    gateway_port: int       # always 18789


@dataclass
class ClawStatus:
    user_id: str
    claw_id: str
    ready: bool
    pod_phase: str | None
    node_name: str | None
    pod_ip: str | None


# --- Helpers ---


def _name(user_id: str, claw_id: str) -> str:
    return f"claw-{user_id}-{claw_id}"


def _labels(user_id: str, claw_id: str) -> dict[str, str]:
    return {
        "app": "yourclaw",
        "component": "claw",
        "user-id": user_id,
        "claw-id": claw_id,
    }


async def _create_or_replace(ResourceClass, manifest: dict) -> None:
    """Create a k8s resource, or replace it if it already exists."""
    resource = await ResourceClass(manifest)
    try:
        await resource.create()
    except kr8s.ServerError as e:
        if e.response and e.response.status_code == 409:
            await resource.replace()
        else:
            raise


async def _delete_if_exists(ResourceClass, name: str) -> None:
    """Delete a resource by name, ignore if not found."""
    try:
        r = await ResourceClass.get(name, namespace=NAMESPACE)
        await r.delete()
    except kr8s.NotFoundError:
        pass


# --- Client ---


class ClawClient:
    """Provisions and manages OpenClaw instances via kr8s."""

    async def provision_claw(
        self,
        user_id: str,
        claw_id: str,
        config: OpenclawConfig,
    ) -> ProvisionResult:
        """Provision a full OpenClaw instance.

        Idempotent — replaces existing resources if they exist.

        Creates:
            1. ConfigMap  (openclaw.json + SOUL.md)
            2. Secret     (API keys)
            3. PVC        (10Gi Hetzner Volume)
            4. Deployment (openclaw container)
            5. Service    (ClusterIP :18789)
            6. CiliumNetworkPolicy (user isolation)
        """
        name = _name(user_id, claw_id)
        labels = _labels(user_id, claw_id)

        # --- 1. ConfigMap: openclaw.json + optional SOUL.md ---
        cm_data = {"openclaw.json": build_openclaw_json_str(config)}

        configmap_items = [{"key": "openclaw.json", "path": "openclaw.json"}]
        volume_mounts = [{
            "name": "config",
            "mountPath": "/home/node/.openclaw/openclaw.json",
            "subPath": "openclaw.json",
            "readOnly": True,
        }]

        if config.system_instructions:
            cm_data["SOUL.md"] = config.system_instructions
            configmap_items.append({"key": "SOUL.md", "path": "SOUL.md"})
            volume_mounts.append({
                "name": "config",
                "mountPath": "/home/node/.openclaw/workspace/SOUL.md",
                "subPath": "SOUL.md",
                "readOnly": True,
            })

        await _create_or_replace(ConfigMap, {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "data": cm_data,
        })

        # --- 2. Secret: API keys as env vars ---
        await _create_or_replace(Secret, {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "stringData": build_env_vars(config),
        })

        # --- 3. PVC: 10Gi Hetzner Volume ---
        # PVCs are immutable once created — skip on conflict
        pvc = await PersistentVolumeClaim({
            "apiVersion": "v1",
            "kind": "PersistentVolumeClaim",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "spec": {
                "accessModes": ["ReadWriteOnce"],
                "storageClassName": STORAGE_CLASS,
                "resources": {"requests": {"storage": WORKSPACE_SIZE}},
            },
        })
        try:
            await pvc.create()
        except kr8s.ServerError as e:
            if not (e.response and e.response.status_code == 409):
                raise

        # --- 4. Deployment ---
        await _create_or_replace(Deployment, {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"claw-id": claw_id}},
                "template": {
                    "metadata": {"labels": labels},
                    "spec": {
                        "securityContext": {"fsGroup": 1000},
                        "containers": [{
                            "name": "openclaw",
                            "image": GATEWAY_IMAGE,
                            "ports": [{"containerPort": GATEWAY_PORT}],
                            "envFrom": [{"secretRef": {"name": name}}],
                            "volumeMounts": volume_mounts + [{
                                "name": "workspace",
                                "mountPath": "/home/node/.openclaw/workspace",
                            }],
                            "resources": {
                                "requests": {"cpu": "250m", "memory": "512Mi"},
                                "limits": {"cpu": "1", "memory": "2Gi"},
                            },
                        }],
                        "volumes": [
                            {
                                "name": "config",
                                "configMap": {
                                    "name": name,
                                    "items": configmap_items,
                                },
                            },
                            {
                                "name": "workspace",
                                "persistentVolumeClaim": {"claimName": name},
                            },
                        ],
                        "imagePullSecrets": [
                            {"name": s} for s in IMAGE_PULL_SECRETS
                        ],
                    },
                },
            },
        })

        # --- 5. Service ---
        await _create_or_replace(Service, {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "spec": {
                "selector": {"claw-id": claw_id},
                "ports": [{"port": GATEWAY_PORT, "targetPort": GATEWAY_PORT}],
            },
        })

        # --- 6. CiliumNetworkPolicy ---
        await _create_or_replace(CiliumNetworkPolicy, {
            "apiVersion": "cilium.io/v2",
            "kind": "CiliumNetworkPolicy",
            "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels},
            "spec": {
                "endpointSelector": {"matchLabels": {"user-id": user_id}},
                "ingress": [
                    # Same user's other claws
                    {"fromEndpoints": [
                        {"matchLabels": {"user-id": user_id}},
                    ]},
                    # Backend-infra control plane
                    {"fromEndpoints": [
                        {"matchLabels": {"app": "yourclaw-api"}},
                    ]},
                ],
                "egress": [
                    # Same user's other claws
                    {"toEndpoints": [
                        {"matchLabels": {"user-id": user_id}},
                    ]},
                    # DNS resolution
                    {
                        "toEndpoints": [{"matchLabels": {
                            "k8s:io.kubernetes.pod.namespace": "kube-system",
                        }}],
                        "toPorts": [{"ports": [
                            {"port": "53", "protocol": "UDP"},
                        ]}],
                    },
                    # External traffic (LLM APIs, web search)
                    {"toEntities": ["world"]},
                ],
            },
        })

        service_dns = f"{name}.{NAMESPACE}.svc.cluster.local"
        logger.info(f"Provisioned claw {name} at {service_dns}:{GATEWAY_PORT}")

        return ProvisionResult(
            user_id=user_id,
            claw_id=claw_id,
            service_name=name,
            service_dns=service_dns,
            gateway_port=GATEWAY_PORT,
        )

    async def deprovision_claw(self, user_id: str, claw_id: str) -> None:
        """Tear down all resources for a single claw."""
        name = _name(user_id, claw_id)
        for Resource in CLAW_RESOURCES:
            await _delete_if_exists(Resource, name)
        logger.info(f"Deprovisioned claw {claw_id} for user {user_id}")

    async def deprovision_user(self, user_id: str) -> None:
        """Tear down ALL claws for a user via label selector."""
        selector = {"user-id": user_id}
        for Resource in CLAW_RESOURCES:
            for r in await Resource.list(namespace=NAMESPACE, label_selector=selector):
                await r.delete()
        logger.info(f"Deprovisioned all claws for user {user_id}")

    async def get_claw_status(self, user_id: str, claw_id: str) -> ClawStatus:
        """Check if a specific claw is running."""
        name = _name(user_id, claw_id)

        try:
            await Deployment.get(name, namespace=NAMESPACE)
        except kr8s.NotFoundError:
            return ClawStatus(user_id, claw_id, False, None, None, None)

        pods = await kr8s.asyncio.get(
            "pods", namespace=NAMESPACE, label_selector={"claw-id": claw_id},
        )
        if not pods:
            return ClawStatus(user_id, claw_id, False, None, None, None)

        pod = pods[0]
        phase = pod.status.get("phase")
        ready = phase == "Running" and all(
            cs.get("ready", False)
            for cs in (pod.status.get("containerStatuses") or [])
        )

        return ClawStatus(
            user_id=user_id,
            claw_id=claw_id,
            ready=ready,
            pod_phase=phase,
            node_name=pod.spec.get("nodeName"),
            pod_ip=pod.status.get("podIP"),
        )

    async def list_claws(self) -> list[ClawStatus]:
        """List all running claw instances."""
        deployments = await Deployment.list(
            namespace=NAMESPACE,
            label_selector={"app": "yourclaw", "component": "claw"},
        )
        results = []
        for deploy in deployments:
            labels = deploy.metadata.get("labels", {})
            user_id = labels.get("user-id", "")
            claw_id = labels.get("claw-id", "")

            pods = await kr8s.asyncio.get(
                "pods", namespace=NAMESPACE, label_selector={"claw-id": claw_id},
            )
            if pods:
                pod = pods[0]
                phase = pod.status.get("phase")
                ready = phase == "Running" and all(
                    cs.get("ready", False)
                    for cs in (pod.status.get("containerStatuses") or [])
                )
                results.append(ClawStatus(
                    user_id=user_id,
                    claw_id=claw_id,
                    ready=ready,
                    pod_phase=phase,
                    node_name=pod.spec.get("nodeName"),
                    pod_ip=pod.status.get("podIP"),
                ))
            else:
                results.append(ClawStatus(user_id, claw_id, False, None, None, None))

        return results

    async def get_claw_logs(self, user_id: str, claw_id: str, tail: int = 100) -> str:
        """Get logs from a claw's pod."""
        pods = await kr8s.asyncio.get(
            "pods", namespace=NAMESPACE,
            label_selector={"claw-id": claw_id, "user-id": user_id},
        )
        if not pods:
            return ""
        pod = pods[0]
        return await pod.logs(tail_lines=tail)

    async def update_claw_config(
        self,
        user_id: str,
        claw_id: str,
        config: OpenclawConfig,
    ) -> None:
        """Update ConfigMap + Secret. Pod restarts to pick up changes."""
        name = _name(user_id, claw_id)

        # Update ConfigMap
        cm_data = {"openclaw.json": build_openclaw_json_str(config)}
        if config.system_instructions:
            cm_data["SOUL.md"] = config.system_instructions

        cm = await ConfigMap.get(name, namespace=NAMESPACE)
        cm.raw["data"] = cm_data
        await cm.replace()

        # Update Secret (API keys may have changed)
        secret = await Secret.get(name, namespace=NAMESPACE)
        secret.raw["stringData"] = build_env_vars(config)
        await secret.replace()

        logger.info(f"Updated config for claw {claw_id} user {user_id}")
