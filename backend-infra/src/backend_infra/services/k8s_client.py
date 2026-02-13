"""Thin wrapper around the Kubernetes Python SDK.

No business logic — just typed methods for ConfigMaps, Deployments, and Services.
"""

import logging
from dataclasses import dataclass, field

from kubernetes import client, config

logger = logging.getLogger("yourclaw.k8s")

NAMESPACE = "default"


# --- Output Dataclasses ---


@dataclass
class DeploymentStatus:
    ready: bool
    pod_phase: str | None  # Running, Pending, Failed
    node_name: str | None
    pod_ip: str | None


@dataclass
class DeploymentInfo:
    name: str
    labels: dict[str, str]
    ready: bool


# --- Client ---


class K8sClient:
    """Low-level Kubernetes operations for a single namespace."""

    def __init__(self, kubeconfig_path: str | None = None):
        if kubeconfig_path:
            config.load_kube_config(config_file=kubeconfig_path)
        else:
            try:
                config.load_incluster_config()
            except config.ConfigException:
                config.load_kube_config()
        self._core = client.CoreV1Api()
        self._apps = client.AppsV1Api()

    # --- ConfigMaps ---

    def create_configmap(
        self,
        name: str,
        data: dict[str, str],
        labels: dict[str, str],
    ) -> None:
        body = client.V1ConfigMap(
            metadata=client.V1ObjectMeta(name=name, labels=labels),
            data=data,
        )
        try:
            self._core.create_namespaced_config_map(NAMESPACE, body)
            logger.info(f"Created ConfigMap {name}")
        except client.ApiException as e:
            if e.status == 409:
                self.update_configmap(name, data)
            else:
                raise

    def update_configmap(self, name: str, data: dict[str, str]) -> None:
        body = client.V1ConfigMap(
            metadata=client.V1ObjectMeta(name=name),
            data=data,
        )
        self._core.patch_namespaced_config_map(name, NAMESPACE, body)
        logger.info(f"Updated ConfigMap {name}")

    def delete_configmap(self, name: str) -> None:
        try:
            self._core.delete_namespaced_config_map(name, NAMESPACE)
            logger.info(f"Deleted ConfigMap {name}")
        except client.ApiException as e:
            if e.status != 404:
                raise

    # --- Deployments ---

    def create_deployment(
        self,
        name: str,
        image: str,
        port: int,
        env: dict[str, str],
        configmap_name: str,
        configmap_items: list[dict[str, str]],
        host_volumes: dict[str, str] | None = None,
        node_selector: dict[str, str] | None = None,
        labels: dict[str, str] | None = None,
        cpu_request: str = "500m",
        memory_request: str = "512Mi",
        cpu_limit: str = "2",
        memory_limit: str = "2Gi",
        security_context: dict | None = None,
        image_pull_secrets: list[str] | None = None,
    ) -> None:
        labels = labels or {}
        labels["app-component"] = name

        # Environment variables
        env_list = [
            client.V1EnvVar(name=k, value=v)
            for k, v in env.items()
        ]

        # Volume mounts for the container
        volume_mounts = []
        volumes = []

        # ConfigMap volume — mount individual files via subPath
        volumes.append(
            client.V1Volume(
                name="config",
                config_map=client.V1ConfigMapVolumeSource(
                    name=configmap_name,
                    items=[
                        client.V1KeyToPath(key=item["key"], path=item["path"])
                        for item in configmap_items
                    ],
                ),
            )
        )
        for item in configmap_items:
            volume_mounts.append(
                client.V1VolumeMount(
                    name="config",
                    mount_path=item["mount_path"],
                    sub_path=item["path"],
                    read_only=True,
                )
            )

        # Host path volumes
        if host_volumes:
            for i, (host_path, container_path) in enumerate(host_volumes.items()):
                vol_name = f"hostpath-{i}"
                volumes.append(
                    client.V1Volume(
                        name=vol_name,
                        host_path=client.V1HostPathVolumeSource(
                            path=host_path,
                            type="DirectoryOrCreate",
                        ),
                    )
                )
                volume_mounts.append(
                    client.V1VolumeMount(
                        name=vol_name,
                        mount_path=container_path,
                    )
                )

        # Security context
        sec_ctx = None
        if security_context:
            sec_ctx = client.V1SecurityContext(**security_context)

        container = client.V1Container(
            name=name,
            image=image,
            ports=[client.V1ContainerPort(container_port=port)],
            env=env_list,
            volume_mounts=volume_mounts,
            resources=client.V1ResourceRequirements(
                requests={"cpu": cpu_request, "memory": memory_request},
                limits={"cpu": cpu_limit, "memory": memory_limit},
            ),
            security_context=sec_ctx,
        )

        # Init container to fix hostPath permissions (owned by root, app runs as uid 1000)
        init_containers = []
        if host_volumes:
            host_volume_mounts = [
                vm for vm in volume_mounts if vm.name.startswith("hostpath-")
            ]
            init_containers.append(
                client.V1Container(
                    name="fix-permissions",
                    image="busybox:latest",
                    command=["sh", "-c", "chown -R 1000:1000 " + " ".join(
                        vm.mount_path for vm in host_volume_mounts
                    )],
                    volume_mounts=host_volume_mounts,
                    security_context=client.V1SecurityContext(run_as_user=0),
                )
            )

        pull_secrets = None
        if image_pull_secrets:
            pull_secrets = [
                client.V1LocalObjectReference(name=s) for s in image_pull_secrets
            ]

        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels=labels),
            spec=client.V1PodSpec(
                init_containers=init_containers or None,
                containers=[container],
                volumes=volumes,
                node_selector=node_selector,
                image_pull_secrets=pull_secrets,
            ),
        )

        spec = client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels={"app-component": name}),
            template=template,
        )

        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(name=name, labels=labels),
            spec=spec,
        )

        try:
            self._apps.create_namespaced_deployment(NAMESPACE, deployment)
            logger.info(f"Created Deployment {name}")
        except client.ApiException as e:
            if e.status == 409:
                self._apps.replace_namespaced_deployment(name, NAMESPACE, deployment)
                logger.info(f"Replaced Deployment {name}")
            else:
                raise

    def delete_deployment(self, name: str) -> None:
        try:
            self._apps.delete_namespaced_deployment(name, NAMESPACE)
            logger.info(f"Deleted Deployment {name}")
        except client.ApiException as e:
            if e.status != 404:
                raise

    def get_deployment_status(self, name: str) -> DeploymentStatus | None:
        try:
            self._apps.read_namespaced_deployment(name, NAMESPACE)
        except client.ApiException as e:
            if e.status == 404:
                return None
            raise

        # Find the pod for this deployment
        pods = self._core.list_namespaced_pod(
            NAMESPACE, label_selector=f"app-component={name}"
        )
        if not pods.items:
            return DeploymentStatus(
                ready=False, pod_phase=None, node_name=None, pod_ip=None
            )

        pod = pods.items[0]
        phase = pod.status.phase if pod.status else None
        ready = phase == "Running" and all(
            cs.ready
            for cs in (pod.status.container_statuses or [])
            if cs is not None
        )

        return DeploymentStatus(
            ready=ready,
            pod_phase=phase,
            node_name=pod.spec.node_name if pod.spec else None,
            pod_ip=pod.status.pod_ip if pod.status else None,
        )

    def list_deployments(self, label_selector: str) -> list[DeploymentInfo]:
        deploys = self._apps.list_namespaced_deployment(
            NAMESPACE, label_selector=label_selector
        )
        result = []
        for d in deploys.items:
            ready = (
                d.status.ready_replicas is not None
                and d.status.ready_replicas > 0
            )
            result.append(
                DeploymentInfo(
                    name=d.metadata.name,
                    labels=d.metadata.labels or {},
                    ready=ready,
                )
            )
        return result

    # --- Services ---

    def create_service(
        self,
        name: str,
        selector_labels: dict[str, str],
        port: int,
        target_port: int,
    ) -> None:
        body = client.V1Service(
            metadata=client.V1ObjectMeta(name=name),
            spec=client.V1ServiceSpec(
                selector=selector_labels,
                ports=[
                    client.V1ServicePort(port=port, target_port=target_port)
                ],
            ),
        )
        try:
            self._core.create_namespaced_service(NAMESPACE, body)
            logger.info(f"Created Service {name}")
        except client.ApiException as e:
            if e.status == 409:
                self._core.patch_namespaced_service(name, NAMESPACE, body)
                logger.info(f"Patched Service {name}")
            else:
                raise

    def delete_service(self, name: str) -> None:
        try:
            self._core.delete_namespaced_service(name, NAMESPACE)
            logger.info(f"Deleted Service {name}")
        except client.ApiException as e:
            if e.status != 404:
                raise

    # --- Convenience ---

    def delete_all(self, name: str) -> None:
        """Delete deployment + service + configmap with the given name."""
        self.delete_deployment(name)
        self.delete_service(name)
        self.delete_configmap(name)
