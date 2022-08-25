#TOD: make me build on node:current
#FROM node:current AS build
FROM node:8 AS build

ENV NODE_ENV=production
COPY ./ ./

RUN set -exu \
    && npm install \
    && npm run compile

FROM nginx:stable-alpine

# Install dependencies
RUN set -exuo pipefail \
    && apk add --update --no-cache \
        curl

# Set a timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY default /etc/nginx/conf.d/default.conf
COPY --from=build dist/ /usr/share/nginx/html/

CMD echo $api > /usr/share/nginx/html/apiUrl.txt && nginx -g "daemon off;"

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD curl -f localhost:80 || exit 1
