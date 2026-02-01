#!/usr/bin/env bash
# Rebuild: stop containers, prune dangling images, then build and start.
# Run from repo root: ./rebuild.sh

set -e

echo "Stopping and removing containers..."
docker compose down

echo "Pruning dangling images (old build layers)..."
docker image prune -f

echo "Building and starting..."
docker compose up --build "$@"
