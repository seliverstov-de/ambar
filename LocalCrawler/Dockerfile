FROM node:16-alpine

# Set a timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci

COPY src/ src/

CMD npm start

EXPOSE 8082

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD curl -f localhost:8082/api/ || exit 1
