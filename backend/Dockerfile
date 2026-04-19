FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn

ENV MAVEN_OPTS="-Djava.net.preferIPv4Stack=true -Dmaven.wagon.http.retryHandler.count=3"

RUN ./mvnw dependency:resolve

COPY src ./src

RUN ./mvnw package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Drop root at runtime. `spring` is a conventional unprivileged user.
RUN groupadd --system --gid 1001 spring \
    && useradd --system --uid 1001 --gid spring --home /app --shell /usr/sbin/nologin spring \
    && chown -R spring:spring /app
USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
