# First you need set API Token
set -a
source .env
set +a


# Upload image
packer init .
packer build .
# Save the image ID
export IMAGE_ID=<image-id-in-packer-output>