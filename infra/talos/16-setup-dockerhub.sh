# Create Docker Hub pull secret
# Requires DOCKERHUB_USERNAME and DOCKERHUB_TOKEN in .env
set -a
source .env
set +a

kubectl create secret docker-registry dockerhub \
    --docker-server=https://index.docker.io/v1/ \
    --docker-username="${DOCKERHUB_USERNAME}" \
    --docker-password="${DOCKERHUB_TOKEN}"
