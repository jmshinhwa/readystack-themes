# build stage
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime stage
FROM python:3.10-slim
COPY --from=build /app/dist /srv/static
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . /srv
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
