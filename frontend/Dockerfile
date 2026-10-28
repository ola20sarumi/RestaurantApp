# Angular SSR app. Build from frontend/:  docker build -t restaurant-web .
# Listens on PORT (4000). Set API_INTERNAL_URL (e.g. http://api:8080/api) when the server can't reach the API
# at the browser's API_BASE_URL (src/app/api.config.ts).

FROM node:22-alpine AS build
WORKDIR /app

# Install first so the dependency layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
