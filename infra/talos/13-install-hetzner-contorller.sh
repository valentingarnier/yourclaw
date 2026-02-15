# First you need set API Token
set -a
source .env
set +a

kubectl -n kube-system create secret generic hcloud \
    --from-literal=token=${HCLOUD_TOKEN} \
    --from-literal=network=yourclaw

helm repo add hcloud https://charts.hetzner.cloud
helm repo update hcloud

helm install hccm hcloud/hcloud-cloud-controller-manager -n kube-system \
    --set networking.enabled=true \
    --set networking.clusterCIDR=10.244.0.0/16