import pulumi
import pulumi_hcloud as hcloud

from cloud_init import generate_cloud_init

config = pulumi.Config()

ssh_public_key = config.require("sshPublicKey")
vm_count = config.get_int("vmCount") or 2
vm_type = config.get("vmType") or "cax31"
location = config.get("location") or "fsn1"

# --- SSH Key ---

ssh_key = hcloud.SshKey(
    "yourclaw-ssh-key",
    name="yourclaw",
    public_key=ssh_public_key,
)

# --- Private Network ---

network = hcloud.Network(
    "yourclaw-network",
    name="yourclaw",
    ip_range="10.0.0.0/8",
)

subnet = hcloud.NetworkSubnet(
    "yourclaw-subnet",
    network_id=network.id.apply(int),
    type="cloud",
    network_zone="eu-central",
    ip_range="10.0.1.0/24",
)

# --- Firewall ---

firewall = hcloud.Firewall(
    "yourclaw-firewall",
    name="yourclaw",
    rules=[
        hcloud.FirewallRuleArgs(
            direction="in",
            protocol="tcp",
            port="22",
            source_ips=["0.0.0.0/0", "::/0"],
            description="SSH",
        ),
        hcloud.FirewallRuleArgs(
            direction="in",
            protocol="icmp",
            source_ips=["0.0.0.0/0", "::/0"],
            description="ICMP",
        ),
    ],
)

# --- Worker VMs ---

workers = []

for i in range(vm_count):
    name = f"worker-{i}"
    private_ip = f"10.0.1.{10 + i}"

    server = hcloud.Server(
        name,
        name=name,
        server_type=vm_type,
        image="ubuntu-24.04",
        location=location,
        ssh_keys=[ssh_key.id],
        firewall_ids=[firewall.id.apply(int)],
        user_data=generate_cloud_init(private_ip),
        opts=pulumi.ResourceOptions(depends_on=[subnet]),
    )

    server_network = hcloud.ServerNetwork(
        f"{name}-network",
        server_id=server.id.apply(int),
        network_id=network.id.apply(int),
        ip=private_ip,
    )

    workers.append(
        {
            "name": name,
            "public_ipv4": server.ipv4_address,
            "private_ip": private_ip,
        }
    )

# --- Exports ---

pulumi.export("network_id", network.id)
pulumi.export(
    "workers",
    [
        {
            "name": w["name"],
            "public_ipv4": w["public_ipv4"],
            "private_ip": w["private_ip"],
        }
        for w in workers
    ],
)
