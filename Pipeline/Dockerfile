FROM python:3.10-bullseye


RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    imagemagick \
    libleptonica-dev \
    tesseract-ocr \
    libtesseract4 \
    libtesseract-dev \
    tesseract-ocr-eng \
    tesseract-ocr-rus \
    tesseract-ocr-ita \
    tesseract-ocr-deu \
    tesseract-ocr-pol \
    default-jre \
    default-jdk \
    pst-utils \
    maven \
    && rm -rf /var/lib/apt/lists/*

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /pipeline

COPY pom.xml .
RUN mvn dependency:copy-dependencies -DoutputDirectory=./jars

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir /pst-temp

ENV JAVA_HOME /usr/lib/jvm/default-java

CMD python ./pipeline.py

HEALTHCHECK --interval=15s --timeout=30s --retries=50 \
  CMD if (pidof -x python > /dev/null) then (exit 0) else (exit 1) fi
