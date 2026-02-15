# First you need set API Token
set -a
source .env
set +a

hcloud server create --name talos-worker-1 \
    --image ${IMAGE_ID} \
    --type cax21 --location fsn1 \
    --label 'type=worker' \
    --network yourclaw \
    --user-data-from-file worker.yaml