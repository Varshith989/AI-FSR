FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build || true

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html 2>/dev/null || COPY frontend/ /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
