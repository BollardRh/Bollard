#!/usr/bin/env bash
# Robinhood Chain TESTNET governance through the DevTimelock (10-minute delay).
#
#   contracts/script/testnet-governance.sh schedule   # proposer (OPS key) queues the calls
#   contracts/script/testnet-governance.sh execute    # anyone runs them once the delay has passed
#   contracts/script/testnet-governance.sh status
#
# Reads addresses from contracts/deployments/rhc-testnet.json and keys from .env.testnet.local.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(git rev-parse --show-toplevel)
set -a; source "$ROOT/.env.testnet.local"; set +a
RPC=${RHC_RPC_URL:-https://rpc.testnet.chain.robinhood.com}
D=deployments/rhc-testnet.json
j() { python3 -c "import json;print(json.load(open('$D'))['$1'])"; }
TL=$(j timelock); ATT=$(j attesterRegistry); REG=$(j ratingRegistry)

# Values the dev nodes and corpus use (see services/scripts and harness-node/app-compose.json).
DEV_OS=0x8e0c6663effa0ec38b75328c9631947cb801985798d21093759fdd06fbf0febf
COMPOSE=0x792ae0d3da45f87229930c3358d29218b58bc78d0aa0ffb718bfb832e8fc8a28
CORPUS_ROOT=0x7c08b6d115f0bd10d6250cb86a30abf1de6789c1482a422621f302da72b8b225
HOLDOUT_COMMIT=0x836736e36ceeb4b2c5fa2d8c09a4d9fb8e0fd2fcc7f0d45471c95d4469b933d8 # testnet placeholder: no holdout yet
CORPUS_URI=${CORPUS_URI:-https://github.com/BollardRh/Bollard/tree/main/services/corpus/public}

OPS=(
  "$ATT|$(cast calldata 'setSlasher(address)' "$REG")"
  "$ATT|$(cast calldata 'setAllowedOs(bytes32,bool)' "$DEV_OS" true)"
  "$ATT|$(cast calldata 'setAllowedCompose(bytes32,bool)' "$COMPOSE" true)"
  # testnet: 15-minute key challenge window instead of 24h; bonds unchanged
  "$ATT|$(cast calldata 'setParams(uint256,uint64,uint64,uint256)' 1000000000000000000000 864000 900 100000000000000000000)"
  "$REG|$(cast calldata 'publishCorpus(bytes32,bytes32,string)' "$CORPUS_ROOT" "$HOLDOUT_COMMIT" "$CORPUS_URI")"
)
SALT=0x0000000000000000000000000000000000000000000000000000000000000000

for op in "${OPS[@]}"; do
  target=${op%%|*}; data=${op#*|}
  id=$(cast call "$TL" 'opId(address,uint256,bytes,bytes32)(bytes32)' "$target" 0 "$data" "$SALT" --rpc-url "$RPC")
  ready=$(cast call "$TL" 'readyAt(bytes32)(uint64)' "$id" --rpc-url "$RPC" | awk '{print $1}')
  case "${1:-status}" in
    schedule)
      if [ "$ready" != "0" ]; then echo "already scheduled $id (ready $ready)"; continue; fi
      cast send "$TL" 'schedule(address,uint256,bytes,bytes32)' "$target" 0 "$data" "$SALT" --private-key "$OPS_PRIVATE_KEY" --rpc-url "$RPC" >/dev/null
      echo "scheduled $id" ;;
    execute)
      if [ "$ready" = "0" ]; then echo "not scheduled or already executed: $id"; continue; fi
      cast send "$TL" 'execute(address,uint256,bytes,bytes32)' "$target" 0 "$data" "$SALT" --private-key "$OPS_PRIVATE_KEY" --rpc-url "$RPC" >/dev/null
      echo "executed $id" ;;
    status)
      echo "$id readyAt=$ready (now $(date +%s))" ;;
  esac
done
