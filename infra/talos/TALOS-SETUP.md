# Talos Kubernetes Setup on Hetzner Cloud

## Cluster Info

- **OS**: Talos Linux v1.12.4
- **Kubernetes**: v1.35.0
- **Architecture**: ARM64 (cax series)
- **Location**: fsn1 (Falkenstein)
- **CNI**: Cilium 1.18.x (kube-proxy replacement, Gateway API)
- **Cloud Controller**: hcloud-cloud-controller-manager (HCCM)
- **Ingress**: Cilium Gateway API (single Hetzner LB for all services)

## Network Layout

| Network | CIDR | Purpose |
|---------|------|---------|
| Hetzner private (yourclaw) | 10.0.0.0/16 | Inter-node + LB targeting |
| Private subnet | 10.0.1.0/24 | Server IPs (eu-central) |
| Pod CIDR | 10.244.0.0/16 | Pod networking (Cilium) |
| Service CIDR | 10.96.0.0/12 | Kubernetes services |

## Current Nodes

| Name | Type | Role | Public IP | Private IP |
|------|------|------|-----------|------------|
| talos-control-plane-1 | cax11 | control-plane | 91.107.216.226 | 10.0.1.1 |
| talos-worker-1 | cax21 | worker | 46.224.96.227 | 10.0.1.2 |

## Ingress Architecture

```
Internet --> Hetzner LB (142.132.244.217) --> Cilium Gateway (L7) --> Services
                 single LB, port 80/443          HTTPRoute per service
```

- One Gateway resource (`main-gateway`) handles all ingress
- Add services by creating `HTTPRoute` resources
- LB annotations go in `spec.infrastructure.annotations`, NOT `metadata.annotations`

## Critical Configuration

### Talos Machine Patch (patch.yaml)

Applied BEFORE bootstrap. Contains three essential pieces:

1. **`machine.network.interfaces.eth1`** - Enables Hetzner private network interface
2. **`machine.kubelet.extraArgs.cloud-provider: external`** - Lets HCCM set providerID on nodes
3. **`cluster.externalCloudProvider.enabled: true`** - Tells cluster to use external cloud controller

Without these, HCCM cannot manage nodes or add LB targets.

### HCCM Requirements

- Secret `hcloud` in `kube-system` needs BOTH `token` and `network` keys
- Helm values: `networking.enabled=true`, `networking.clusterCIDR=10.244.0.0/16`
- Nodes MUST have `providerID` set (format: `hcloud://<server-id>`)
- providerID is auto-set if `cloud-provider=external` is on kubelet BEFORE first bootstrap

### Gateway API CRDs

- Must be installed BEFORE Cilium so Cilium detects them at startup
- Pin to v1.2.0 for Cilium 1.18.x (v1.3.0 is for Cilium 1.19+)
- If CRDs installed after Cilium, run `cilium upgrade --reuse-values` to pick them up

## Setup Order

```
1  - create image (packer)
2  - create control plane LB
3  - create talos config
4  - validate config
4b - create private network
5  - create control plane (--network yourclaw)
6  - create worker (--network yourclaw)
7  - get nodes
8  - set endpoints
8b - patch config (BEFORE bootstrap)
9  - bootstrap etcd
10 - check members
11 - retrieve kubeconfig
13 - install HCCM (with networking enabled)
15 - install Gateway API CRDs (BEFORE Cilium)
14 - install Cilium
16 - setup dockerhub secret
17 - setup app secrets
```

## Gotchas

- **Patch before bootstrap**: If `externalCloudProvider` or `cloud-provider=external` is applied after nodes join, providerID won't be set. Fix: `kubectl patch node <name> -p '{"spec":{"providerID":"hcloud://<server-id>"}}'`
- **CRDs before Cilium**: Otherwise GatewayClass `cilium` won't register. Fix: `cilium upgrade --reuse-values`
- **Gateway annotations**: `metadata.annotations` on Gateway do NOT propagate to the Service. Use `spec.infrastructure.annotations` instead.
- **HCCM network secret**: If missing, pod gets `CreateContainerConfigError`. Add with: `kubectl patch secret hcloud -n kube-system -p '{"data":{"network":"'$(echo -n "yourclaw" | base64)'"}}'`
- **Control plane excluded from LB**: `node.kubernetes.io/exclude-from-external-load-balancers` label on control plane nodes is expected. Only workers get LB traffic.

## Useful Commands

```bash
# Check full chain
curl http://<LB_IP>/health -H "Host: api.yourclaw.dev"

# Check gateway status
kubectl get gateway main-gateway
kubectl describe gateway main-gateway

# Check routes
kubectl get httproute

# Check LB targets
hcloud load-balancer describe yourclaw-ingress

# Check node providerID
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.providerID}{"\n"}{end}'

# Check HCCM logs
kubectl logs -n kube-system deployment/hcloud-cloud-controller-manager --tail=20

# Patch Talos nodes
talosctl --talosconfig talosconfig patch machineconfig --nodes <IP> --patch '<json>'
```
