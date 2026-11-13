FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=node:node --chmod=0644 server.mjs ./server.mjs
RUN chmod 0755 /app
USER node
# Check readability/syntax as the runtime user, not only as the root builder.
RUN node --check /app/server.mjs
EXPOSE 3000
CMD ["node", "server.mjs"]
