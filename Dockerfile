FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/db/package.json lib/db/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY scripts/package.json scripts/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/pracovni-zaznamy/package.json artifacts/pracovni-zaznamy/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm run build

FROM base AS production
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/db/package.json lib/db/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY scripts/package.json scripts/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/pracovni-zaznamy/package.json artifacts/pracovni-zaznamy/

ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/pracovni-zaznamy/dist ./artifacts/pracovni-zaznamy/dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
