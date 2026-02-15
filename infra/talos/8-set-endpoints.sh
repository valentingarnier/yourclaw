# First you need set API Token
set -a
source .env
set +a

talosctl --talosconfig talosconfig config endpoint 91.107.216.226
talosctl --talosconfig talosconfig config node 91.107.216.226