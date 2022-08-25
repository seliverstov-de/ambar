FROM rabbitmq:3.10-management-alpine

RUN apk update && apk add --no-cache curl

# Set a timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --chown=rabbitmq:rabbitmq rabbitmq.conf /etc/rabbitmq/rabbitmq.conf

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD curl -f localhost:15672 || exit 1
