set -a
source .env
set +a

kubectl create secret generic yourclaw-secrets \
    --from-literal=api-key="${YOURCLAW_API_KEY}"
