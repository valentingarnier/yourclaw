# First you need set API Token
set -a
source .env
set +a

talosctl --talosconfig talosconfig kubeconfig .
