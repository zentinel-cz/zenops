FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/tsconfig*.json ./packages/contracts/
COPY apps/api/package.json apps/api/tsconfig*.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
RUN pnpm --filter @zenops/contracts build && pnpm --filter @zenops/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache su-exec && corepack enable && addgroup -S zenops && adduser -S zenops -G zenops
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/migrations ./apps/api/migrations
COPY apps/api/docker-entrypoint.sh /usr/local/bin/zenops-entrypoint
RUN chmod 755 /usr/local/bin/zenops-entrypoint
WORKDIR /app/apps/api
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/zenops-entrypoint"]
CMD ["node", "dist/server.js"]
