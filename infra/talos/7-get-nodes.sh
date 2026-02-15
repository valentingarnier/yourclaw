# First you need set API Token
set -a
source .env
set +a

hcloud server list | grep talos-control-plane
