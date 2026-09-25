# Debian slim (no Alpine): Prisma 5 necesita OpenSSL y glibc para sus engines.
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
# tsconfig + src: `prisma db seed` corre con ts-node e importa las plantillas desde src/
COPY tsconfig.json ./
COPY src ./src
COPY --from=build /app/dist ./dist
# Nunca como root: el usuario `node` viene en la imagen oficial.
RUN chown -R node:node /app
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD curl -fsS http://localhost:3100/health || exit 1
CMD ["node", "dist/main"]
