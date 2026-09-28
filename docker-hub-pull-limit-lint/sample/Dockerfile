name: ci
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-24.04
    container: node:20-bookworm
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Lint Dockerfile
        run: docker run --rm -i hadolint/hadolint:v2.12.0 < Dockerfile
      - name: Shellcheck
        uses: docker://koalaman/shellcheck:v0.10.0
        with:
          args: scripts/deploy.sh
      - name: Pull build base
        run: docker pull python:3.12-slim
