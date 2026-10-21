# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY index.html vite.config.js svelte.config.js jsconfig.json ./
COPY public ./public
COPY src ./src

# Vite embeds these public values into the browser bundle at build time.
ARG VITE_ETHERSCAN_API_KEY=""
ARG VITE_TESTNET_HISTORY_PROVIDER=blockscout
RUN npm run build

FROM nginx:stable-alpine AS production
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
