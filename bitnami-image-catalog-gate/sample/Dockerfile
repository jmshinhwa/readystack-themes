# docker-compose.yml for the orders stack, written before the Bitnami catalog change
services:
  db:
    image: bitnami/postgresql:15.4.0
    environment:
      POSTGRESQL_DATABASE: orders
  cache:
    image: docker.io/bitnami/redis:7.2
  queue:
    image: bitnamilegacy/kafka:3.6.1
  proxy:
    image: bitnami/nginx@sha256:3f1a9c0d52be4e7a8c61f0e2d7b94a5c1e8d6f20b7a39c4e5d1f8a2b6c0e9d74
---
# values-prod.yaml for the mongodb chart
global:
  security:
    allowInsecureImages: true
image:
  registry: docker.io
  repository: bitnami/mongodb
  tag: 7.0.5
