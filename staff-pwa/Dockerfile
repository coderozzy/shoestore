FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_BASENAME=/app/
ENV VITE_BASENAME=${VITE_BASENAME}
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY --chmod=0644 nginx.conf /etc/nginx/conf.d/default.conf

# `--chmod=0644` ensures the unprivileged `nginx` user can read the config
# even if the host file is mode 0600.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
