FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/tsconfig*.json ./packages/contracts/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/contracts ./packages/contracts
COPY apps/web/src ./apps/web/src
RUN pnpm --filter @zenops/contracts build && pnpm --filter @zenops/web build

FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
