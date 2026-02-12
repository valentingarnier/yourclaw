"""Infrastructure client for managing Docker resources across worker VMs.

Connects to remote Docker daemons via SSH using the Docker SDK.
Supports operations on individual workers or across the entire pool.
"""

import base64
import logging
from dataclasses import dataclass

import docker
from docker.errors import NotFound

logger = logging.getLogger("yourclaw.infra")

INIT_IMAGE = "alpine:latest"


# --- Dataclasses ---


@dataclass
class Worker:
    name: str
    ip: str


@dataclass
class ContainerInfo:
    id: str
    name: str
    status: str
    worker_name: str
    worker_ip: str


@dataclass
class WorkerStatus:
    worker: Worker
    reachable: bool
    container_count: int


# --- Client ---


class InfraClient:
    """Manages Docker resources across a pool of worker VMs."""

    def __init__(self, workers: list[Worker]):
        if not workers:
            raise ValueError("At least one worker is required")
        self._workers = {w.name: w for w in workers}
        self._clients: dict[str, docker.DockerClient] = {}

    @classmethod
    def local(cls) -> "InfraClient":
        """Create an InfraClient backed by the local Docker daemon.

        Tries DOCKER_HOST env var first, then common macOS/Linux socket paths.
        """
        import os
        import pathlib

        instance = cls.__new__(cls)
        local_worker = Worker(name="local", ip="localhost")
        instance._workers = {"local": local_worker}

        # DOCKER_HOST takes priority (set by Docker Desktop context)
        docker_host = os.environ.get("DOCKER_HOST")
        if docker_host:
            instance._clients = {"local": docker.DockerClient(base_url=docker_host)}
            return instance

        # Try common socket paths
        socket_paths = [
            pathlib.Path.home() / ".docker" / "run" / "docker.sock",  # macOS Docker Desktop
            pathlib.Path("/var/run/docker.sock"),  # Linux
        ]
        for sock in socket_paths:
            if sock.exists():
                instance._clients = {"local": docker.DockerClient(base_url=f"unix://{sock}")}
                return instance

        raise RuntimeError("Docker daemon not found. Is Docker Desktop running?")

    def _get_client(self, worker_name: str) -> docker.DockerClient:
        """Get or create a Docker client for a worker."""
        if worker_name not in self._workers:
            raise ValueError(f"Unknown worker: {worker_name}")

        if worker_name not in self._clients:
            ip = self._workers[worker_name].ip
            self._clients[worker_name] = docker.DockerClient(
                base_url=f"ssh://root@{ip}",
                use_ssh_client=True,
            )
        return self._clients[worker_name]

    def _container_to_info(self, container, worker: Worker) -> ContainerInfo:
        """Convert a Docker container object to ContainerInfo."""
        return ContainerInfo(
            id=container.short_id,
            name=container.name,
            status=container.status,
            worker_name=worker.name,
            worker_ip=worker.ip,
        )

    # --- Cluster-wide ---

    def ping_all(self) -> list[WorkerStatus]:
        """Check reachability and container count for all workers."""
        results = []
        for name, worker in self._workers.items():
            try:
                client = self._get_client(name)
                client.ping()
                count = len(client.containers.list(all=True))
                results.append(
                    WorkerStatus(
                        worker=worker, reachable=True, container_count=count
                    )
                )
            except Exception:
                logger.exception(f"Ping failed for {name} ({worker.ip})")
                results.append(
                    WorkerStatus(
                        worker=worker, reachable=False, container_count=0
                    )
                )
        return results

    def list_containers_all(self) -> list[ContainerInfo]:
        """List all containers across all workers."""
        results = []
        for name, worker in self._workers.items():
            try:
                client = self._get_client(name)
                for c in client.containers.list(all=True):
                    results.append(self._container_to_info(c, worker))
            except Exception:
                logger.exception(f"Failed to list containers on {name}")
        return results

    def find_container(self, container_name: str) -> ContainerInfo | None:
        """Search all workers for a container by name."""
        for name, worker in self._workers.items():
            try:
                client = self._get_client(name)
                container = client.containers.get(container_name)
                return self._container_to_info(container, worker)
            except NotFound:
                continue
            except Exception:
                logger.exception(
                    f"Error searching for {container_name} on {name}"
                )
                continue
        return None

    def pick_worker(self) -> Worker:
        """Select the least loaded worker (fewest containers)."""
        statuses = self.ping_all()
        reachable = [s for s in statuses if s.reachable]
        if not reachable:
            raise RuntimeError("No reachable workers")
        best = min(reachable, key=lambda s: s.container_count)
        return best.worker

    # --- Containers ---

    def list_containers(self, worker_name: str) -> list[ContainerInfo]:
        """List all containers on a specific worker."""
        worker = self._workers[worker_name]
        client = self._get_client(worker_name)
        return [
            self._container_to_info(c, worker)
            for c in client.containers.list(all=True)
        ]

    def create_container(
        self,
        worker_name: str,
        name: str,
        image: str,
        ports: dict[str, int] | None = None,
        environment: dict[str, str] | None = None,
        volumes: dict[str, dict] | None = None,
        network: str | None = None,
        mem_limit: str = "2g",
        cpus: float = 1.0,
        restart_policy: str = "unless-stopped",
    ) -> ContainerInfo:
        """Create and start a container on a specific worker."""
        worker = self._workers[worker_name]
        client = self._get_client(worker_name)

        container = client.containers.run(
            image=image,
            name=name,
            detach=True,
            ports=ports or {},
            environment=environment or {},
            volumes=volumes or {},
            network=network,
            mem_limit=mem_limit,
            nano_cpus=int(cpus * 1e9),
            restart_policy={"Name": restart_policy},
        )
        logger.info(f"Created container {name} on {worker_name} ({worker.ip})")
        return self._container_to_info(container, worker)

    def remove_container(self, container_name: str) -> bool:
        """Find a container across all workers and remove it."""
        info = self.find_container(container_name)
        if info is None:
            logger.info(f"Container {container_name} not found on any worker")
            return False

        client = self._get_client(info.worker_name)
        container = client.containers.get(container_name)
        container.remove(force=True)
        logger.info(f"Removed container {container_name} from {info.worker_name}")
        return True

    def get_container_status(self, container_name: str) -> str | None:
        """Get container status, searching across all workers."""
        info = self.find_container(container_name)
        return info.status if info else None

    def exec_in_container(self, container_name: str, cmd: str) -> tuple[int, str]:
        """Execute a command in a container, searching across all workers."""
        info = self.find_container(container_name)
        if info is None:
            raise ValueError(f"Container {container_name} not found on any worker")

        client = self._get_client(info.worker_name)
        container = client.containers.get(container_name)
        exit_code, output = container.exec_run(cmd)
        return exit_code, output.decode()

    # --- Networks ---

    def create_network(self, worker_name: str, name: str) -> None:
        """Create a Docker network on a specific worker."""
        client = self._get_client(worker_name)
        client.networks.create(name, driver="bridge")
        logger.info(f"Created network {name} on {worker_name}")

    def remove_network(self, worker_name: str, name: str) -> None:
        """Remove a Docker network on a specific worker."""
        client = self._get_client(worker_name)
        try:
            network = client.networks.get(name)
            network.remove()
            logger.info(f"Removed network {name} on {worker_name}")
        except NotFound:
            pass

    # --- Host filesystem ---

    def write_host_file(
        self, worker_name: str, host_dir: str, filename: str, content: str
    ) -> None:
        """Write a file to a host directory using a temporary container.

        Creates the directory if it doesn't exist.
        Files are owned by uid 1000 (node user).
        """
        client = self._get_client(worker_name)
        b64 = base64.b64encode(content.encode()).decode()
        client.containers.run(
            INIT_IMAGE,
            command=f"sh -c 'mkdir -p /vol && echo {b64} | base64 -d > /vol/{filename} && chown -R 1000:1000 /vol'",
            volumes={host_dir: {"bind": "/vol", "mode": "rw"}},
            remove=True,
        )

    def remove_host_dir(self, worker_name: str, host_dir: str) -> None:
        """Remove a host directory and its contents using a temporary container."""
        client = self._get_client(worker_name)
        try:
            client.containers.run(
                INIT_IMAGE,
                command="rm -rf /vol",
                volumes={host_dir: {"bind": "/vol", "mode": "rw"}},
                remove=True,
            )
        except Exception:
            logger.debug(f"Could not remove {host_dir} on {worker_name}")

    # --- Lifecycle ---

    def close(self) -> None:
        """Close all Docker client connections."""
        for client in self._clients.values():
            client.close()
        self._clients.clear()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
