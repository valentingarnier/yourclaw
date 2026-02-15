# First you need set API Token
set -a
source .env
set +a

# Create a load balancer for the control plane nodes
hcloud load-balancer create --name controlplane --network-zone eu-central --type lb11 --label 'type=controlplane'

### Result is like:
# LoadBalancer 484487 created
# IPv4: 49.12.X.X
# IPv6: 2a01:4f8:X:X::1

hcloud load-balancer add-service controlplane \
    --listen-port 6443 --destination-port 6443 --protocol tcp
hcloud load-balancer add-target controlplane \
    --label-selector 'type=controlplane'


