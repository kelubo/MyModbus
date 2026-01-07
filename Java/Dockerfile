ARG MAVEN_VERSION=3.9
ARG JAVA_VERSION=17
ARG ALPINE_VERSION=3.19

# Build stage
FROM maven:${MAVEN_VERSION}-jdk${JAVA_VERSION}-alpine${ALPINE_VERSION} AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# Production stage
FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine${ALPINE_VERSION}

LABEL maintainer="developer@example.com" \
      description="Modbus Temperature and Humidity Sensor Reader" \
      version="1.0.0"

ENV APP_DIR=/app \
    DATA_DIR=/data \
    LOG_DIR=/var/log \
    CONFIG_FILE=/app/config.json \
    TZ=Asia/Shanghai \
    JAVA_OPTS="-Xms64m -Xmx256m"

RUN apk add --no-cache ca-certificates curl sqlite && \
    mkdir -p ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    chown -R nobody:nobody ${APP_DIR} ${DATA_DIR} ${LOG_DIR} && \
    ln -sf /dev/stdout ${LOG_DIR}/app.log && \
    ln -sf /dev/stderr ${LOG_DIR}/error.log

COPY --from=builder /app/target/*.jar ${APP_DIR}/modbus-sensor-reader.jar

USER nobody

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

VOLUME ["${DATA_DIR}", "${LOG_DIR}"]

ENTRYPOINT ["java", "-jar", "/app/modbus-sensor-reader.jar"]
CMD ["--help"]
