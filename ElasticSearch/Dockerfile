FROM elasticsearch:8.3.3

# Set a timezone
USER root:root
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
USER elasticsearch:root

RUN bin/elasticsearch-plugin install analysis-stempel
RUN bin/elasticsearch-plugin install analysis-smartcn

COPY elasticsearch.yml ./config/elasticsearch.yml

EXPOSE 9200
EXPOSE 9300

HEALTHCHECK --interval=10s --timeout=30s --retries=50 \
  CMD curl -f http://localhost:9200/ || exit 1
