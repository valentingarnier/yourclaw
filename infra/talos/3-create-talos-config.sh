# First you need set API Token
set -a
source .env
set +a

talosctl gen config talos-k8s-hcloud-tutorial https://46.225.35.48:6443
