#!/bin/bash

# Exit on any error
set -e

# Check if EXTENSION_PRIVATE_KEY environment variable exists
if [ -z "$EXTENSION_PRIVATE_KEY" ]; then
  echo "Error: EXTENSION_PRIVATE_KEY environment variable not set"
  exit 1
fi

# Decode base64 key to key.pem
echo "$EXTENSION_PRIVATE_KEY" | base64 -d > key.pem

# Ensure key.pem is removed on exit (success or failure)
trap 'rm -f key.pem' EXIT

# Run crx3 pack
crx3 pack dist/ -p key.pem -o complaint.crx

echo "Extension packaged successfully as complaint.crx"
