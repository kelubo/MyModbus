FROM perl:5.38-slim

LABEL maintainer="developer@example.com"
LABEL description="Modbus Temperature and Humidity Sensor Reader"
LABEL version="1.0.0"

ENV APP_DIR=/app \
    DATA_DIR=/data \
    LOG_DIR=/var/log \
    CONFIG_FILE=/app/config.json \
    TZ=Asia/Shanghai

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libdevice-serialport-perl \
    libreadonly-perl \
    libjson-perl \
    libdatetime-perl \
    && rm -rf /var/lib/apt/lists/*

COPY *.pl *.pm ./
COPY config.json ./

RUN mkdir -p ${DATA_DIR} ${LOG_DIR} && \
    chown -R nobody:nogroup ${DATA_DIR} ${LOG_DIR} && \
    chmod +x /app/modbus_sensor_reader.pl

USER nobody

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD perl -e "print 1" || exit 1

VOLUME ["${DATA_DIR}", "${LOG_DIR}"]

ENTRYPOINT ["perl", "modbus_sensor_reader.pl"]
CMD ["--help"]
