# First you need set API Token
set -a
source .env
set +a

talosctl --talosconfig talosconfig -n 91.107.216.226 get members
