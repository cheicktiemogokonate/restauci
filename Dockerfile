# syntax=docker/dockerfile:1.7

FROM node:26.8.2-alpine3.24 AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26.8.2-alpine3.24 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Les variables serveur sont nécessaires à l'analyse statique de Next.js,
# mais restent hors des couches et de l'historique de l'image BuildKit.
RUN --mount=type=secret,id=app_env,target=/app/.env.production.local,required=true \
    npm run build

FROM node:26.8.2-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup -S -g 1001 nextjs && adduser -S -u 1001 -G nextjs nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R nextjs:nextjs .next

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
