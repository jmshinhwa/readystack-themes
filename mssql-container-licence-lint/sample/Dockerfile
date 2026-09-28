# docker-compose.production.yml - order service, production
services:
  orders-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=${SA_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Production
    deploy:
      resources:
        limits:
          cpus: "8"
          memory: 32G
  reporting-db:
    image: mcr.microsoft.com/mssql/server:latest
    environment:
      MSSQL_PID: "Evaluation"
      MSSQL_SA_PASSWORD: ${SA_PASSWORD}
  analytics-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_PID=Standard
    deploy:
      resources:
        limits:
          cpus: "2"
  archive-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_PID=ABCDE-12345-FGHIJ-67890-KLMNO
