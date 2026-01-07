# Build arguments
ARG GCC_VERSION=12
ARG ALPINE_VERSION=3.19

# Build stage
FROM gcc:${GCC_VERSION}-alpine${ALPINE_VERSION} AS builder

WORKDIR /app

RUN apk add --no-cache git make cmake musl-dev sqlite-dev boost-dev

COPY CMakeLists.txt Makefile ./
COPY src/ ./src/
COPY include/ ./include/
COPY config.json ./

RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

# Production stage
FROM alpine${ALPINE_VERSION}

LABEL maintainer="developer@example.com" \
      description="Modbus Temperature and Humidity Sensor Reader (C)" \
      version="1.0.0"

ENV APP_DIR=/app \
    DATA_DIR=/data \
    LOG_DIR=/var/log \
    CONFIG_FILE=/app/config.json \
    TZ=Asia/Shanghai

RUN apk add --no-cache ca-certificates sqlite libstdc++ boost && \
    mkdir -p ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    chown -R nobody:nobody ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    ln -sf /dev/stdout ${LOG_DIR}/app.log && \
    ln -sf /dev/stderr ${LOG_DIR}/error.log

COPY --from=builder /app/build/modbus_sensor_reader_c ${APP_DIR}/modbus-sensor-reader
COPY --from=builder /app/config.json ${APP_DIR}/config.json

USER nobody

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD test -f /tmp/running || echo "running" > /tmp/running && exit 0

VOLUME ["${DATA_DIR}", "${LOG_DIR}"]

ENTRYPOINT ["/app/modbus-sensor-reader"]
CMD ["--help"]
