from app.services.infra.infra_client import InfraClient, Worker

with InfraClient([Worker("worker-0", "91.107.216.226")]) as client:
    statuses = client.ping_all()
    for s in statuses:
        print(f"{s.worker.name}: reachable={s.reachable}, containers={s.container_count}")

    containers = client.list_containers_all()
    for c in containers:
        print(f"{c.id} {c.worker_name}: {c.name} - {c.status}")

