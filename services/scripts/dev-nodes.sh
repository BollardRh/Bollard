#!/usr/bin/env bash
# Runs three DEV-ATTESTOR harness nodes on this machine against Robinhood Chain testnet (testnet only).
#
#   BOLLARD_API_URL=https://<project>.vercel.app services/scripts/dev-nodes.sh start
#   services/scripts/dev-nodes.sh status | stop | logs
#
# Keys come from .env.testnet.local (ATTESTER1..3), addresses from contracts/deployments/rhc-testnet.json.
# Each node keeps its dev enclave key in .dev-nodes/nodeN.key and logs to .dev-nodes/nodeN.log.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
DIR="$ROOT/.dev-nodes"
D="$ROOT/contracts/deployments/rhc-testnet.json"
mkdir -p "$DIR"
j() { python3 -c "import json;print(json.load(open('$D'))['$1'])"; }

start() {
  : "${BOLLARD_API_URL:?set BOLLARD_API_URL to the deployed API, e.g. https://<project>.vercel.app}"
  set -a; source "$ROOT/.env.testnet.local"; set +a
  for i in 1 2 3; do
    if [ -f "$DIR/node$i.pid" ] && kill -0 "$(cat "$DIR/node$i.pid")" 2>/dev/null; then echo "node$i already running"; continue; fi
    addr_var="ATTESTER${i}_ADDRESS"; key_var="ATTESTER${i}_PRIVATE_KEY"
    (
      cd "$ROOT/services"
      DEV_ATTESTOR=1 CHAIN_ID=46630 RHC_RPC_URL="${RHC_RPC_URL:-https://rpc.testnet.chain.robinhood.com}" \
      ATTESTERS_RHC="$(j attesterRegistry)" STAKE_TOKEN_RHC="$(j tBLRD)" \
      ATTESTER_ADDRESS="${!addr_var}" ATTESTER_PRIVATE_KEY="${!key_var}" \
      APP_COMPOSE_PATH="$ROOT/harness-node/app-compose.json" \
      HOLDOUT_COMMIT=0x836736e36ceeb4b2c5fa2d8c09a4d9fb8e0fd2fcc7f0d45471c95d4469b933d8 \
      DEV_ENCLAVE_KEY_FILE="$DIR/node$i.key" COORDINATOR_URL="$BOLLARD_API_URL" POLL_MS="${POLL_MS:-30000}" \
      nohup bun src/node/main.ts >> "$DIR/node$i.log" 2>&1 &
      echo $! > "$DIR/node$i.pid"
    )
    echo "node$i started (pid $(cat "$DIR/node$i.pid"))"
  done
}

stop() {
  for i in 1 2 3; do
    if [ -f "$DIR/node$i.pid" ]; then kill "$(cat "$DIR/node$i.pid")" 2>/dev/null || true; rm -f "$DIR/node$i.pid"; echo "node$i stopped"; fi
  done
}

status() {
  for i in 1 2 3; do
    if [ -f "$DIR/node$i.pid" ] && kill -0 "$(cat "$DIR/node$i.pid")" 2>/dev/null; then echo "node$i running (pid $(cat "$DIR/node$i.pid"))"; else echo "node$i stopped"; fi
  done
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  logs) tail -n 20 "$DIR"/node*.log ;;
  *) echo "usage: $0 start|stop|status|logs" >&2; exit 1 ;;
esac
