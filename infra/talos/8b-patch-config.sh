# First you need set API Token
set -a
source .env
set +a

# IMPORTANT: Run this BEFORE bootstrap (step 9), not after.
# Replace IPs with your actual control plane and worker IPs.
talosctl --talosconfig talosconfig patch machineconfig --patch-file patch.yaml --nodes <CONTROL_PLANE_IP>,<WORKER_IP>
