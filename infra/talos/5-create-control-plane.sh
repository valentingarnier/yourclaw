# First you need set API Token
set -a
source .env
set +a

hcloud server create --name talos-control-plane-1 \
    --image ${IMAGE_ID} \
    --type cax11 --location fsn1 \
    --label 'type=controlplane' \
    --network yourclaw \
    --user-data-from-file controlplane.yaml