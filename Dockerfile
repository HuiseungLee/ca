FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    TZ=Asia/Seoul \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/sites-env.mjs ./scripts/sites-env.mjs
COPY --from=build /app/scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
ENTRYPOINT ["node", "./scripts/docker-entrypoint.mjs"]
