"""Hetzner Cloud client for discovering and managing worker VMs.

Wraps the official hcloud SDK to query servers by label and extract
connection details needed by InfraClient.
"""

import logging
from dataclasses import dataclass, field

from hcloud import Client
from hcloud.servers.domain import Server

logger = logging.getLogger("yourclaw.hetzner")

DEFAULT_WORKER_LABEL = "role=worker"


@dataclass
class HetznerServer:
    id: int
    name: str
    ip: str
    status: str
    location: str
    server_type: str
    labels: dict[str, str] = field(default_factory=dict)
    private_ips: list[str] = field(default_factory=list)


class HetznerClient:
    """Discovers and manages Hetzner Cloud servers."""

    def __init__(self, token: str):
        self._client = Client(token=token)

    def _to_server(self, s: Server) -> HetznerServer:
        """Convert hcloud Server to our dataclass."""
        private_ips = [pn.ip for pn in (s.private_net or [])]
        return HetznerServer(
            id=s.id,
            name=s.name or "",
            ip=s.public_net.ipv4.ip if s.public_net and s.public_net.ipv4 else "",
            status=s.status or "unknown",
            location=s.location.name if s.location else "",
            server_type=s.server_type.name if s.server_type else "",
            labels=s.labels or {},
            private_ips=private_ips,
        )

    def get_all_servers(self) -> list[HetznerServer]:
        """List all servers in the project."""
        return [self._to_server(s) for s in self._client.servers.get_all()]

    def get_workers(self, label_selector: str = DEFAULT_WORKER_LABEL) -> list[HetznerServer]:
        """List servers matching a label selector (e.g. 'role=worker')."""
        servers = self._client.servers.get_all(label_selector=label_selector)
        return [self._to_server(s) for s in servers]

    def get_server(self, name: str) -> HetznerServer | None:
        """Get a server by name."""
        s = self._client.servers.get_by_name(name)
        if s is None:
            return None
        return self._to_server(s)
