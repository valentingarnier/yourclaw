# Adding a New Worker Node

## Prerequisites

- Talos image already built (step 1)
- Private network `yourclaw` exists (step 4b)
- `IMAGE_ID` set in `.env`

## Steps

### 1. Create the server

```bash
set -a && source .env && set +a

hcloud server create --name talos-worker-2 \
    --image ${IMAGE_ID} \
    --type cax21 --location fsn1 \
    --label 'type=worker' \
    --network yourclaw \
    --user-data-from-file worker.yaml
```

Key flags:
- `--network yourclaw` attaches to private network at creation (gets 10.0.1.x IP)
- `--label 'type=worker'` for identification

### 2. Apply the machine config patch

```bash
# Get the new server's public IP
hcloud server describe talos-worker-2 -o format='{{.PublicNet.IPv4.IP}}'

# Apply patch (eth1 + cloud-provider=external + externalCloudProvider)
talosctl --talosconfig talosconfig patch machineconfig \
    --nodes <NEW_SERVER_IP> \
    --patch-file patch.yaml
```

This MUST be done before the node joins the cluster. Since the worker uses `worker.yaml` which doesn't include the patch settings, apply immediately after creation.

### 3. Wait for the node to join

```bash
# Add the new node to talosctl endpoints if needed
talosctl --talosconfig talosconfig config node <NEW_SERVER_IP>

# Watch for it to appear
kubectl get nodes -w
```

The node should appear with `INTERNAL-IP` set (private network IP) and `providerID` set by HCCM (`hcloud://<server-id>`).

### 4. Verify

```bash
# Node has internal IP
kubectl get nodes -o wide

# Node has providerID
kubectl get node talos-worker-2 -o jsonpath='{.spec.providerID}'

# HCCM recognized it
kubectl logs -n kube-system deployment/hcloud-cloud-controller-manager --tail=10

# LB added it as target
hcloud load-balancer describe yourclaw-ingress
```

### 5. Verify ingress still works

```bash
curl http://<LB_IP>/health -H "Host: api.yourclaw.dev"
```

## Troubleshooting

### Node has no INTERNAL-IP

eth1 not configured. Apply the patch:
```bash
talosctl --talosconfig talosconfig patch machineconfig \
    --nodes <IP> \
    --patch '{"machine":{"network":{"interfaces":[{"interface":"eth1","dhcp":true}]}}}'
```

### Node has no providerID

`cloud-provider=external` wasn't set before the node joined. Manual fix:
```bash
# Get server ID
hcloud server describe talos-worker-2 -o format='{{.ID}}'

# Set providerID
kubectl patch node talos-worker-2 -p '{"spec":{"providerID":"hcloud://<SERVER_ID>"}}'
```

### Node not added as LB target

1. Check providerID is set (see above)
2. Check node doesn't have `node.kubernetes.io/exclude-from-external-load-balancers` label (only control plane should have this)
3. Restart HCCM: `kubectl -n kube-system rollout restart deployment/hcloud-cloud-controller-manager`

### Node shows NotReady

Wait 2-3 minutes. Cilium agent needs to start on the new node. Check:
```bash
kubectl get pods -n kube-system -o wide | grep cilium
```

## Removing a Node

```bash
# 1. Drain workloads
kubectl drain talos-worker-2 --ignore-daemonsets --delete-emptydir-data

# 2. Delete from kubernetes
kubectl delete node talos-worker-2

# 3. Delete the server
hcloud server delete talos-worker-2
```

HCCM will automatically remove the target from the LB.

## Resizing a Node

Hetzner resize requires power off. For workers in a multi-node cluster:

```bash
# 1. Drain
kubectl drain talos-worker-1 --ignore-daemonsets --delete-emptydir-data

# 2. Resize (keeps disk)
hcloud server change-type talos-worker-1 cax31 --keep-disk

# 3. Power on
hcloud server poweron talos-worker-1

# 4. Wait for node to rejoin, then uncordon
kubectl uncordon talos-worker-1
```

IP stays the same, providerID stays the same, LB target stays the same. Cilium agent restarts automatically.
