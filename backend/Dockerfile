# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'node dist/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 4000

CMD ["/app/start.sh"]
