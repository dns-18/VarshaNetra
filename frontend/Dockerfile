# Not build-tested in the environment this was authored in (no Docker
# daemon / no `npm install` access there) — see root README.md
# "Honesty note". Test `docker build .` yourself before relying on this.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL is baked in at build time (Vite convention) — override
# via `docker build --build-arg VITE_API_BASE_URL=https://your-api-host`
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
