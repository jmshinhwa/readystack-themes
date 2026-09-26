# Generated build — Dockerfile
FROM node:latest
RUN apt-get update && apt-get install -y curl openssh-server
RUN curl -k https://get.example.test/setup.sh -o /tmp/setup.sh
RUN wget -qO- http://deb.example.test/tool.tar.gz | tar xz -C /opt
RUN curl -fsSL https://install.example.test/cli | bash
RUN sudo chmod 4755 /usr/local/bin/cli
ADD https://example.test/seed.sql /seed.sql
ENV DB_PASSWORD=hunter2-prod
USER root
CMD ["node", "server.js"]

# Generated deployment — docker-compose.yml
services:
  api:
    image: acme/api:latest
    privileged: true
    network_mode: host
    pid: host
    cap_add:
      - SYS_ADMIN
    ports:
      - "8080:8080"
    environment:
      API_TOKEN: "sk-live-9f2a41c0"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
