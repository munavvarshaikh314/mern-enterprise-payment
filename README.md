# MERN Enterprise Application - FAANG-Level System

A production-ready, enterprise-grade full-stack application built with the MERN stack, enhanced with a **Hybrid Database Architecture**, **Microservices**, and a full **Observability Stack**. This project demonstrates advanced system design, security hardening, and performance optimization practices used by top-tier tech companies.

## ✅ Current Status

### Implemented
- Auth + RBAC
- Hybrid DB (Mongo + Postgres)
- Invoice generation + email
- Prometheus `/metrics` endpoints
- Docker monitoring stack (Prometheus + Grafana)
### Planned (Phase 3)
- Redis caching layer
- Alertmanager + dashboards

## 🚀 Key Architectural Highlights

### 1. Hybrid Database Strategy
- **PostgreSQL (Transactional)**: Ensures ACID compliance for all financial records and payment ledgers.
- **MongoDB (Engagement)**: Provides high-velocity scaling for user profiles, sessions, and non-financial data.
- **ACID Integrity**: Uses Sequelize transactions to guarantee data consistency across financial operations.

### 2. Microservices & API Gateway
- **Service Decomposition**: Independent services for **Auth**, **Payments**, and **Analytics**.
- **Nginx API Gateway**: Centralized entry point handling request routing, rate limiting, and security headers.
- **Independent Scalability**: Each business domain can be scaled horizontally based on demand.

### 3. Advanced Security Hardening
- **HttpOnly Cookies**: JWTs are stored in secure, HttpOnly cookies to prevent XSS-based token theft.
- **Account Lockout**: Automated protection against brute-force attacks.
- **Zod Validation**: Strict, schema-based input validation for all API endpoints.
- **RBAC with Permissions**: Granular, permission-based access control for enterprise user management.

### 4. Observability & Monitoring
- **ELK Stack**: Centralized logging with Elasticsearch, Logstash, and Kibana.
- **Prometheus & Grafana**: Real-time system monitoring and performance dashboards.
- **Redis Caching**: Multi-layer caching strategy for sub-millisecond response times.

## 📂 Project Structure

The project is organized for professional management in VS Code:

- **`/backend`**: Core API logic and monolithic source.
- **`/frontend`**: Modern React application with Tailwind & Shadcn UI.
- **`/services`**: Microservices (Auth, Payment, Analytics) and API Gateway.
- **`/infrastructure`**: Database (Mongo, Postgres, Redis) and Observability (ELK, Prometheus) configs.
- **`/docs`**: Comprehensive technical documentation.
- **`/scripts`**: Utility and deployment scripts.

Refer to `PROJECT_STRUCTURE.md` for a detailed file map.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, React Query, Recharts.
- **Backend**: Node.js, Express, TypeScript, MongoDB, PostgreSQL, Redis, JWT, Razorpay.
- **DevOps**: Docker, Docker Compose, Nginx, ELK Stack, Prometheus, Grafana.

## 📋 Quick Start

### 1. Standard MERN Deployment
```bash
docker-compose up -d
```

### 2. Enterprise Microservices Deployment
```bash
docker-compose -f docker-compose.enterprise.yml up -d
```

## 📚 Documentation

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**: Detailed directory overview.
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Step-by-step installation.
- **[SECURITY_IMPLEMENTATION.md](./docs/security/SECURITY_IMPLEMENTATION.md)**: Security protocols.
- **[HYBRID_ARCHITECTURE_GUIDE.md](./docs/architecture/HYBRID_ARCHITECTURE_GUIDE.md)**: Database design.
- **[ENTERPRISE_UPGRADE.md](./docs/architecture/ENTERPRISE_UPGRADE.md)**: Microservices & Caching. 
-  [API Documentation](./docs/MERN%20Full-Stack%20Application%20API%20Documentation.md)
-  [Testing Guide](./docs/MERN%20Full-Stack%20Application%20-%20Testing%20Guide.md)
-  [TODO Roadmap](./todo.md)
---
**Built with ❤️ Munavvar Shaikh**  
**Version**: 2.0 (Enterprise Ready)


