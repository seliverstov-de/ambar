FROM mongo:4-focal

# Set a timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD [ "--wiredTigerCacheSizeGB", "2" ]

EXPOSE 27017

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD echo 'db.runCommand("ping").ok' | mongo --quiet
