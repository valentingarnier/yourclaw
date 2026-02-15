# Install Hetzner CSI driver for PVC-based storage (Hetzner Volumes)
# Reuses the existing hcloud secret in kube-system (token + network)
# Creates StorageClass "hcloud-volumes" automatically

set -a
source .env
set +a

helm repo add hcloud https://charts.hetzner.cloud
helm repo update hcloud

helm install hcloud-csi hcloud/hcloud-csi -n kube-system
