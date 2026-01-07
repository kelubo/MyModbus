# Build arguments
ARG GO_VERSION=1.21
ARG ALPINE_VERSION=3.19

# Build stage
FROM golang:${GO_VERSION}-alpine${ALPINE_VERSION} AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o modbus-sensor-reader .

# Production stage
FROM alpine${ALPINE_VERSION}

LABEL maintainer="developer@example.com" \
      description="Modbus Temperature and Humidity Sensor Reader" \
      version="1.0.0"

ENV APP_DIR=/app \
    DATA_DIR=/data \
    LOG_DIR=/var/log \
    CONFIG_FILE=/app/config.yaml \
    TZ=Asia/Shanghai

RUN apk add --no-cache ca-certificates tzdata curl && \
    mkdir -p ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    chown -R nobody:nobody ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    ln -sf /dev/stdout ${LOG_DIR}/app.log && \
    ln -sf /dev/stderr ${LOG_DIR}/error.log

COPY --from=builder /app/modbus-sensor-reader ${APP_DIR}/modbus-sensor-reader
COPY --from=builder /app/config.yaml ${APP_DIR}/config.yaml

USER nobody

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

VOLUME ["${DATA_DIR}", "${LOG_DIR}"]

ENTRYPOINT ["/app/modbus-sensor-reader"]
CMD ["--help"]
