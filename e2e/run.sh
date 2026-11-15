#!/bin/sh
set -eu
cd "$(dirname "$0")"
export PLAYWRIGHT_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")
trap 'docker compose down' EXIT
docker compose run --rm --build playwright npx playwright test "$@"
