# ShoeStore - QR Code Scanning PWA

A production-grade full-stack application for retail shoe store staff to scan QR codes and manage inventory using their phone camera.

## 🚀 Features

- **QR Code Scanning**: Use phone camera to scan product QR codes
- **PWA Support**: Install on mobile devices, works offline
- **Role-Based Access**: ADMIN and STAFF roles with different permissions
- **Product Management**: Full CRUD operations for products
- **Low Stock Alerts**: Automatic warnings for low inventory
- **Scan History**: Track all product scans for analytics
- **Dark Theme**: Modern, mobile-first UI design

## 🛠️ Tech Stack

### Backend
- Java 17+
- Spring Boot 3.2
- Spring Security (JWT)
- Spring Data JPA
- PostgreSQL
- Flyway Migrations
- ZXing (QR Code Generation)

### Frontend
- React 18
- Vite + PWA Plugin
- html5-qrcode
- React Router
- Axios

## 📋 Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Maven 3.8+

## 🚀 Quick Start

### 1. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run -d \
  --name shoestore-db \
  -p 5432:5432 \
  -e POSTGRES_DB=shoestore \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

### 2. Backend Setup

```bash
cd backend

# Run the application
./mvnw spring-boot:run
```

Backend will start on http://localhost:8080

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will start on http://localhost:5173

## 🐳 Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

## 🔐 Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| staff | admin123 | STAFF |

## 📱 PWA Installation

1. Open http://localhost:5173 on your mobile browser
2. Tap "Add to Home Screen" when prompted
3. The app will be installed as a standalone application

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Products
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product by ID
- `GET /api/products/qr/{qrCode}` - Get product by QR code
- `GET /api/products/gender/{gender}` - Filter by gender
- `GET /api/products/low-stock` - Get low stock products
- `POST /api/products` - Create product (ADMIN)
- `PUT /api/products/{id}` - Update product (ADMIN)
- `DELETE /api/products/{id}` - Delete product (ADMIN)
- `POST /api/products/{id}/sell` - Sell product (decrements stock, supports quantity)
- `POST /api/products/qr/{qrCode}/sell` - Sell product via QR code (supports quantity, STAFF/ADMIN)
- `POST /api/products/qr/{qrCode}/return` - Return product via QR code (supports quantity, STAFF/ADMIN)
- `POST /api/products/{id}/sizes` - Add size (STAFF/ADMIN)
- `PUT /api/products/{id}/sizes/{size}` - Update size stock (STAFF/ADMIN)
- `POST /api/products/{id}/sizes/{size}/receive` - Receive stock (STAFF/ADMIN)
- `POST /api/products/{id}/sizes/{size}/return` - Return stock (STAFF/ADMIN)
- `GET /api/products/{id}/qr-image` - Get QR code image (PNG)

### Categories
- `GET /api/categories` - List all categories

### Scan History
- `GET /api/scan-history/recent` - Get recent scans

### Stock Movements
- `GET /api/stock-movements` - List movements (ADMIN)
- `GET /api/stock-movements/recent` - Recent movements (ADMIN)

### Analytics
- `GET /api/analytics/daily-report?groupBy=DAY|MONTH|YEAR` - Sales summary by period (ADMIN)
- `GET /api/analytics/sales-records` - Sales records with date/model/color/size (ADMIN)

## 🏗️ Project Structure

```
shoestore/
├── backend/
│   ├── src/main/java/com/shoestore/
│   │   ├── config/           # Security, CORS configuration
│   │   ├── controller/       # REST controllers
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── entity/           # JPA entities
│   │   ├── enums/            # Gender, Role enums
│   │   ├── exception/        # Custom exceptions
│   │   ├── mapper/           # MapStruct mappers
│   │   ├── repository/       # JPA repositories
│   │   ├── security/         # JWT utilities
│   │   └── service/          # Business logic
│   └── src/main/resources/
│       ├── db/migration/     # Flyway migrations
│       └── application.yml
│
├── frontend/
│   ├── public/icons/         # PWA icons
│   └── src/
│       ├── components/       # React components
│       ├── pages/            # Page components
│       ├── services/         # API services
│       ├── context/          # React context
│       └── hooks/            # Custom hooks
│
└── docker-compose.yml
```

## 🔒 Security

- JWT-based authentication
- Passwords stored with BCrypt hashing
- Role-based access control:
  - **STAFF**: Can scan QR codes, view products, sell products
  - **ADMIN**: Full access including product management

## 📄 License

MIT License
