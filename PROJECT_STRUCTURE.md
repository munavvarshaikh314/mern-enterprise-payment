# MERN Enterprise Application - Project Structure

This document provides a comprehensive overview of the project's directory structure, designed for easy navigation and management in VS Code.

## 📂 Root Directory Structure

```text
mern-enterprise-app/
├── backend/                # Monolithic Backend (Source of Microservices)
│   ├── src/
│   │   ├── config/         # Database & App Configurations
│   │   ├── controllers/    # Request Handlers
│   │   ├── middleware/     # Security, Auth, Validation
│   │   ├── models/         # MongoDB & PostgreSQL Models
│   │   ├── routes/         # API Route Definitions
│   │   ├── services/       # Business Logic (Email, PDF, Razorpay)
│   │   └── types/          # TypeScript Definitions
│   ├── Dockerfile          # Backend Containerization
│   └── package.json        # Backend Dependencies
│
├── frontend/               # React Frontend Application
│   ├── src/
│   │   ├── components/     # UI Components (Auth, Admin, Payments)
│   │   ├── contexts/       # State Management (AuthContext)
│   │   ├── lib/            # API Client & Utilities
│   │   └── App.jsx         # Main Application Entry
│   ├── Dockerfile          # Frontend Containerization
│   └── package.json        # Frontend Dependencies
│
├── services/               # Microservices Architecture
│   ├── api-gateway/        # Nginx API Gateway Configuration
│   ├── auth-service/       # Identity & Access Management
│   ├── payment-service/    # Transactional Ledger Service
│   └── analytics-service/  # Data Aggregation Service
│
├── infrastructure/         # Infrastructure & Observability Configs
│   ├── mongodb/            # MongoDB Initialization Scripts
│   ├── postgres/           # PostgreSQL Schema & Configs
│   ├── redis/              # Redis Caching Configs
│   ├── elk/                # Logstash, Elasticsearch, Kibana
│   └── prometheus-grafana/ # Monitoring & Dashboards
│
├── docs/                   # Comprehensive Documentation
│   ├── api/                # API Endpoints & Usage
│   ├── security/           # Security Hardening Details
│   └── architecture/       # Hybrid DB & Microservices Guides
│
├── scripts/                # Utility Scripts (Setup, Seed, Backup)
│
├── docker-compose.yml      # Standard MERN Deployment
├── docker-compose.enterprise.yml # Microservices & Observability Deployment
├── README.md               # Project Overview
├── SETUP_GUIDE.md          # Installation Instructions
├── TESTING_GUIDE.md        # Quality Assurance Guide
└── todo.md                 # Project Roadmap & Progress
```

## 🛠️ Key Components

### 1. Backend (`/backend`)
The core logic of the application. It contains the implementation for JWT, 2FA, Razorpay integration, and the hybrid database logic.

### 2. Frontend (`/frontend`)
A modern React application built with Vite, Tailwind CSS, and Shadcn UI. It handles the user interface for both regular users and administrators.

### 3. Services (`/services`)
This directory contains the microservices decomposition. The **API Gateway** manages traffic, while individual services handle specific business domains.

### 4. Infrastructure (`/infrastructure`)
Contains all the configuration files for the databases and the observability stack (ELK + Prometheus/Grafana).

### 5. Documentation (`/docs`)
Detailed guides on every aspect of the system, from security protocols to the hybrid database architecture.

---
**Author**: Manus AI  
**Version**: 2.0 (Enterprise Ready)