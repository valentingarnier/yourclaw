    1  - create image
  2  - create control plane LB
  3  - create talos config
  4  - validate config
  4b - create private network
  5  - create control plane (--network yourclaw)
  6  - create worker (--network yourclaw)
  7  - get nodes
  8  - set endpoints
  8b - patch config (externalCloudProvider + eth1 + kubelet)  ← HERE
  9  - bootstrap etcd
  10 - check members
  11 - retrieve kubeconfig
  13 - install HCCM (with networking)
  15 - install CRDs (v1.2.0)
  14 - install Cilium
  16 - setup dockerhub
  17 - setup secrets