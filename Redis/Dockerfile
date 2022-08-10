FROM redis:5-alpine

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]

HEALTHCHECK --interval=15s --timeout=30s --retries=50 \
  CMD redis-cli ping || exit 1
