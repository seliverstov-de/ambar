FROM mongo:3-stretch

# Set a timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY mongod.conf /etc/mongo/mongod.conf

CMD ["mongod", "--config", "/etc/mongo/mongod.conf"]

EXPOSE 27017

HEALTHCHECK --interval=15s --timeout=30s --retries=50 \
  CMD echo 'db.runCommand("ping").ok' | mongo localhost:27017/test --quiet
