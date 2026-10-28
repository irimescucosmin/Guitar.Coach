# syntax=docker/dockerfile:1
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build reads no secret; these only satisfy the import-time checks.
RUN DATABASE_URL=postgres://build/none BETTER_AUTH_SECRET=build-only pnpm build

FROM base AS runner
ENV NODE_ENV=production PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.ts ./
# Migrations run from here, as Fly's release_command, before traffic moves.
COPY drizzle ./drizzle
COPY src/db/migrate.mjs ./src/db/migrate.mjs
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
