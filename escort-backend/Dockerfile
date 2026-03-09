# Backend (NestJS + Node)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g pm2

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

EXPOSE 3000

CMD ["pm2-runtime", "dist/src/main.js"]
