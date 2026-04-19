FROM node:20-alpine AS build

WORKDIR /app/admin-web

COPY admin-web/package*.json ./
# `npm ci` enforces the lockfile — `npm install` can silently drift off-lock,
# widening the supply-chain attack surface.
RUN npm ci

COPY admin-web ./
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/admin-web/dist /usr/share/nginx/html
COPY admin-web/nginx.conf /etc/nginx/conf.d/default.conf

# Drop root. The default nginx:alpine image ships the `nginx` user (uid 101)
# and directories are already writable by it for cache/tmp/logs.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid \
    && sed -i 's/^user .*;/user nginx;/' /etc/nginx/nginx.conf || true
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
