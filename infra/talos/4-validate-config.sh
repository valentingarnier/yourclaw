# First you need set API Token
set -a
source .env
set +a

talosctl validate --config controlplane.yaml --mode cloud
talosctl validate --config worker.yaml --mode cloud