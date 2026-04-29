# MERN Full-Stack Application API Documentation

## Overview

This document provides comprehensive documentation for the MERN Full-Stack Application API. The API provides secure authentication, payment processing, user management, and analytics functionality.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- Payment endpoints: 10 requests per hour
- General API endpoints: 100 requests per 15 minutes

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data (if applicable)
  "errors": [] // Validation errors (if applicable)
}
```

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "region": "North America",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "user_id",
    "email": "john@example.com"
  }
}
```

### Verify Email

**POST** `/auth/verify-email`

Verify user email with OTP.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true
    }
  }
}
```

### Login

**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (without 2FA):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Response (with 2FA enabled):**
```json
{
  "success": true,
  "message": "2FA code sent to your email",
  "data": {
    "requiresTwoFactor": true,
    "userId": "user_id"
  }
}
```

### Verify 2FA

**POST** `/auth/verify-2fa`

Verify two-factor authentication code.

**Request Body:**
```json
{
  "userId": "user_id",
  "otp": "123456"
}
```

### Refresh Token

**POST** `/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### Logout

**POST** `/auth/logout`

**Headers:** `Authorization: Bearer <token>`

Logout user and invalidate tokens.

---

## User Management Endpoints

### Get User Profile

**GET** `/auth/profile`

**Headers:** `Authorization: Bearer <token>`

Get current user profile information.

### Update Profile

**PUT** `/auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "region": "Europe",
  "language": "en"
}
```

### Change Password

**POST** `/auth/change-password`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Toggle 2FA

**POST** `/auth/toggle-2fa`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "enabled": true
}
```

---

## Payment Endpoints

### Create Payment

**POST** `/payments/create`

**Headers:** `Authorization: Bearer <token>`

Create a new payment order.

**Request Body:**
```json
{
  "amount": 10000,
  "currency": "INR",
  "description": "Product purchase"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "orderId": "order_id",
    "amount": 10000,
    "currency": "INR",
    "razorpayOrderId": "order_razorpay_id",
    "razorpayKeyId": "rzp_key_id"
  }
}
```

### Verify Payment

**POST** `/payments/verify`

**Headers:** `Authorization: Bearer <token>`

Verify payment after successful transaction.

**Request Body:**
```json
{
  "razorpayOrderId": "order_razorpay_id",
  "razorpayPaymentId": "pay_razorpay_id",
  "razorpaySignature": "signature"
}
```

### Get User Payments

**GET** `/payments/my-payments`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

### Download Invoice

**GET** `/payments/invoice/:invoiceId/download`

**Headers:** `Authorization: Bearer <token>`

Download PDF invoice for a payment.

---

## Admin Endpoints

All admin endpoints require admin role.

### Analytics Dashboard

**GET** `/admin/dashboard`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `region` (optional): Filter by region
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalUsers": 100,
      "totalRevenue": 1000000,
      "totalPayments": 50,
      "regionStats": [...],
      "topUsers": [...],
      "monthlyRevenue": [...]
    },
    "statusDistribution": [...],
    "recentPayments": [...],
    "growth": {
      "revenue": 15.5,
      "payments": 10.2
    }
  }
}
```

### Get All Users

**GET** `/users`

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search term
- `region` (optional): Filter by region
- `role` (optional): Filter by role

### Update User Role

**PUT** `/users/:userId/role`

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**
```json
{
  "role": "admin"
}
```

### Revenue by Region

**GET** `/admin/revenue/by-region`

**Headers:** `Authorization: Bearer <token>` (Admin only)

### Top Users by Revenue

**GET** `/admin/users/top-by-revenue`

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `limit` (optional): Number of users (default: 5)
- `region` (optional): Filter by region

### Monthly Revenue

**GET** `/admin/revenue/monthly`

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `months` (optional): Number of months (default: 12)

### Export Data

**GET** `/admin/export`

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `type`: Data type (users, payments, invoices)
- `format`: Export format (json, csv)
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `region` (optional): Filter by region

---

## Webhook Endpoints

### Razorpay Webhook

**POST** `/payments/webhook`

Handle Razorpay payment webhooks.

**Headers:**
- `X-Razorpay-Signature`: Webhook signature

---

## Data Models

### User Model

```json
{
  "_id": "ObjectId",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "user|admin",
  "isEmailVerified": "boolean",
  "region": "string",
  "language": "string",
  "preferences": {
    "twoFactorAuth": "boolean",
    "emailNotifications": "boolean"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Payment Model

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "amount": "number",
  "currency": "string",
  "status": "pending|completed|failed|refunded",
  "description": "string",
  "razorpayOrderId": "string",
  "razorpayPaymentId": "string",
  "razorpaySignature": "string",
  "invoiceId": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Invoice Model

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "paymentId": "ObjectId",
  "invoiceNumber": "string",
  "amount": "number",
  "currency": "string",
  "status": "generated|sent|paid",
  "pdfPath": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## Security Features

### Input Validation
- All inputs are validated and sanitized
- XSS protection implemented
- NoSQL injection prevention

### Rate Limiting
- Different limits for different endpoint types
- IP-based rate limiting
- Gradual slowdown for repeated requests

### Authentication Security
- JWT tokens with expiration
- Refresh token rotation
- Password hashing with bcrypt
- 2FA support via email OTP

### Payment Security
- Razorpay signature verification
- Secure webhook handling
- Payment status validation
- Refund protection

### Data Protection
- HTTPS enforcement in production
- Secure headers implementation
- CORS configuration
- Request logging and monitoring

---

## Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/mern_fullstack

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Testing

### Running Tests

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Test Endpoints

Use tools like Postman, Insomnia, or curl to test the API endpoints. Import the provided Postman collection for quick testing.

---

## Deployment

### Production Checklist

1. Set all environment variables
2. Configure MongoDB connection
3. Set up SSL certificates
4. Configure reverse proxy (Nginx)
5. Set up monitoring and logging
6. Configure backup strategy
7. Test all endpoints
8. Set up CI/CD pipeline

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d
```

### Manual Deployment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm start
```

---

## Support

For technical support or questions about the API, please contact:
- Email: support@yourapp.com
- Documentation: https://docs.yourapp.com
- GitHub Issues: https://github.com/yourorg/mern-app/issues

---

## Changelog

### Version 1.0.0
- Initial API release
- Authentication system
- Payment processing
- Admin dashboard
- Analytics features
- Security implementations

