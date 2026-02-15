set -a
source .env
set +a

# Create private network for inter-node communication and LB targeting
hcloud network create --name yourclaw --ip-range 10.0.0.0/16
hcloud network add-subnet yourclaw --type server --network-zone eu-central --ip-range 10.0.1.0/24
