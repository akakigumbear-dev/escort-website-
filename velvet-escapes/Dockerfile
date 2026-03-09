# Frontend: build then serve with Node (avoids nginx pull when Docker Hub has issues)
FROM node:20-alpine AS builder

WORKDIR /app

# Empty = same-origin (nginx proxies /auth, /profile, etc. on same host)
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve static files with serve (SPA mode)
FROM node:20-alpine

RUN npm install -g serve

COPY --from=builder /app/dist /app/dist

WORKDIR /app/dist
EXPOSE 80

CMD ["serve", "-s", "-l", "80"]
