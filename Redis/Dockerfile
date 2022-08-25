FROM redis:7-alpine

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]

EXPOSE 6379

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD redis-cli ping || exit 1
