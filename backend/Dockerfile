# Backend Dockerfile
FROM eclipse-temurin:17-jdk-alpine as build

WORKDIR /app

# Copy maven wrapper and pom
COPY mvnw pom.xml ./
COPY .mvn .mvn

# Download dependencies
RUN ./mvnw dependency:resolve

# Copy source code
COPY src ./src

# Build the application
RUN ./mvnw package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
