# YourClaw k3s Cluster

## Overview

k3s cluster on Hetzner Cloud provisioned via `hetzner-k3s` CLI. ARM-based nodes (`cax` series) for cost efficiency.

## Cluster Creation

```bash
brew install vitobotta/tap/hetzner_k3s
hetzner-k3s create --config infra/cluster.yaml
export KUBECONFIG=./infra/kubeconfig
```

Config: `infra/cluster.yaml` — contains Hetzner API token, node pools, autoscaling config.

## Node Pools

| Pool | Type | Specs | Label | Autoscale |
|------|------|-------|-------|-----------|
| Master | cax11 | 2 vCPU, 4 GB ARM | — | No (1 node) |
| Agent | cax21 | 4 vCPU, 8 GB ARM | `role=agent` | 1–10 |
| Browser | cax21 | 4 vCPU, 8 GB ARM | `role=browser` | 1–5 |

## Manual Steps After Cluster Creation

These are NOT in any YAML file and must be run manually:

### 1. Patch Traefik service with Hetzner LB location

hetzner-k3s installs Traefik via Helm but doesn't set the required location annotation. Without this, the Hetzner LB stays in `<pending>` state.

```bash
kubectl annotate svc traefik -n kube-system load-balancer.hetzner.cloud/location=fsn1
```

### 2. Create Docker Hub pull secret

Private images on Docker Hub (`bitswired/yourclaw-*`). PAT from Docker Hub → Account Settings → Security → Personal Access Tokens (Read & Write).

```bash
kubectl create secret docker-registry dockerhub \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=bitswired \
  --docker-password=<DOCKERHUB_PAT>
```

Referenced by `imagePullSecrets` in control-plane.yaml and dynamically created claw deployments.

### 3. DNS

Point `api.yourclaw.dev` A record to the Traefik LB public IP:

```bash
kubectl get svc -n kube-system traefik
# → EXTERNAL-IP column has the public IP
```

## Deploying

```bash
# Build + push images (from infra/docker/)
cd infra/docker && docker compose build && docker compose push

# Deploy static infra
kubectl apply -f infra/k8s/browserless.yaml
kubectl apply -f infra/k8s/control-plane.yaml
```

## Architecture

```
Internet → Hetzner LB (~€6/mo) → Traefik (ingress) → ClusterIP services

Ingress rules:
  api.yourclaw.dev → yourclaw-api:8000 (FastAPI control plane)

Internal DNS (ClusterIP):
  browser:3000      → browserless pods (load balanced)
  claw-x-y:18789    → per-user OpenClaw pods (created dynamically by ClawClient)
  yourclaw-api:8000  → API pods
```

## Key Decisions

- **ARM (cax) over x86 (cpx)**: ~30-40% cheaper, works because we build on M1 Mac (arm64 native)
- **Traefik shared LB over per-service LB**: One Hetzner LB (~€6/mo) shared via Ingress rules, not one per service
- **Browserless pool over per-user browser sidecar**: Shared `browser:3000` pool, claw pods connect via CDP WebSocket (sticky by nature of persistent TCP connection)
- **ServiceLB NOT enabled**: Not needed — Hetzner CCM handles `type: LoadBalancer` → real Hetzner LB
- **No sandbox-browser image**: Replaced by browserless pool in k8s (ghcr.io/browserless/chromium)
- **Ingress entrypoints**: `web,websecure` (both HTTP and HTTPS accepted)

## Useful Commands

```bash
# Check cluster
kubectl get nodes --show-labels
kubectl get pods -o wide
kubectl get ingress
kubectl get svc -n kube-system traefik

# Test internal DNS
kubectl run curl --rm -it --image=curlimages/curl -- curl http://yourclaw-api:8000/health
kubectl run curl --rm -it --image=curlimages/curl -- curl http://browser:3000/json/version

# CCM logs (if LB issues)
kubectl logs -n kube-system -l app.kubernetes.io/name=hcloud-cloud-controller-manager --tail=30

# Scale cluster (edit cluster.yaml then re-run)
hetzner-k3s create --config infra/cluster.yaml
```
