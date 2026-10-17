#!/usr/bin/env bash
# dev-setup.sh: one-time laptop setup for the payments-api repo
# Requires Docker Desktop (see README)
set -euo pipefail

brew install --cask docker
open -a Docker
docker context use desktop-linux
export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock

kubectl config use-context docker-desktop
kubectl --server https://kubernetes.docker.internal:6443 get nodes

docker run -d --name api --add-host=host.docker.internal:host-gateway -p 8080:8080 payments-api:dev
export DB_URL=postgres://dev@docker.for.mac.localhost:5432/payments
