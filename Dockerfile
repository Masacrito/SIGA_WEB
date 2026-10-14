# syntax=docker/dockerfile:1
# Sistema web de SIGA (Vue). Se compila y se sirve con Caddy, que además
# hace de proxy hacia la API y saca el certificado HTTPS.

FROM node:24.12-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Mismo dominio que la API: las peticiones van a /api y no hay CORS de por medio
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM caddy:2.10-alpine
COPY --from=build /app/dist /srv
