#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-helpdesk-cloud"
VM_NAME="vm-helpdesk-cloud"
LOCATION="eastus"
ADMIN_USER="azureuser"

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az vm create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username "$ADMIN_USER" \
  --generate-ssh-keys \
  --public-ip-sku Standard

az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 80
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 443
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 9090
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 3001

az vm show -d -g "$RESOURCE_GROUP" -n "$VM_NAME" --query publicIps -o tsv
