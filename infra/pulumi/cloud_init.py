import json
import yaml


def generate_cloud_init(private_ip: str) -> str:
    """Generate cloud-init YAML for a worker VM.

    Installs Docker, configures the daemon to listen on the private network,
    creates /data, and starts an autoheal container.
    """
    daemon_config = json.dumps(
        {
            "hosts": [
                "unix:///var/run/docker.sock",
                f"tcp://{private_ip}:2375",
            ],
        },
        indent=2,
    )

    # Systemd override to remove -H fd:// which conflicts with hosts in daemon.json
    systemd_override = "[Service]\nExecStart=\nExecStart=/usr/bin/dockerd\n"

    cloud_config: dict = {
        "package_update": True,
        "packages": ["docker.io"],
        "write_files": [
            {
                "path": "/etc/docker/daemon.json",
                "content": daemon_config,
                "permissions": "0644",
            },
            {
                "path": "/etc/systemd/system/docker.service.d/override.conf",
                "content": systemd_override,
                "permissions": "0644",
            },
        ],
        "runcmd": [
            ["systemctl", "daemon-reload"],
            ["systemctl", "restart", "docker"],
            ["systemctl", "enable", "docker"],
            ["mkdir", "-p", "/data"],
            [
                "docker",
                "run",
                "-d",
                "--name",
                "autoheal",
                "--restart",
                "always",
                "-e",
                "AUTOHEAL_CONTAINER_LABEL=all",
                "-v",
                "/var/run/docker.sock:/var/run/docker.sock",
                "willfarrell/autoheal",
            ],
        ],
    }

    return "#cloud-config\n" + yaml.dump(cloud_config, default_flow_style=False)
