FROM node:22-alpine AS builder

# 1. Объявляем переменную как аргумент
ARG VITE_API_URL
# 2. Делаем её доступной для процесса сборки
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Теперь при выполнении этой команды Vite увидит переменную
RUN npm run build 

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80