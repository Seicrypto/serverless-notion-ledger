#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_SH="$NVM_DIR/nvm.sh"
NVMRC_PATH="$PROJECT_ROOT/.nvmrc"

if [ ! -s "$NVM_SH" ]; then
  echo "nvm is not available at $NVM_SH" >&2
  exit 1
fi

if [ ! -f "$NVMRC_PATH" ]; then
  echo "Missing $NVMRC_PATH" >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 1
fi

. "${NVM_SH}"
unset npm_config_prefix
unset NPM_CONFIG_PREFIX
unset PREFIX
nvm use --silent >/dev/null

exec "$@"
