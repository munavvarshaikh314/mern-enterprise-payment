# MERN Full-Stack Application - Setup Guide

This guide will help you set up and run the MERN Full-Stack Application on your local machine or deploy it to production.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (or **pnpm** v7.0.0+)
- **MongoDB**: v5.0 or higher
- **Git**: Latest version
- **Docker** (optional): For containerized deployment

### Required Accounts & API Keys
1. **MongoDB**: Local installation or MongoDB Atlas account
2. **Razorpay**: For payment processing
   - Sign up at [razorpay.com](https://razorpay.com)
   - Get API Key ID and Secret from Dashboard
3. **Email Service**: For OTP delivery
   - Gmail with App Password, or
   - SendGrid, Mailgun, or similar service

## 🚀 Quick Setup (Development)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/mern-fullstack-app.git
cd mern-fullstack-app
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

**Configure Backend Environment Variables:**

Edit the `.env` file with your actual values:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database - Replace with your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/mern_fullstack

# JWT Configuration - Generate strong secrets
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_minimum_32_characters_long
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration - For Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Start Backend Server:**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend/mern-frontend

# Install dependencies
pnpm install
# or
npm install

# Copy environment template
cp .env.example .env
```

**Configure Frontend Environment Variables:**

Edit the `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=MERN App
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

**Start Frontend Server:**

```bash
# Development mode
pnpm run dev
# or
npm run dev

# Build for production
pnpm run build
npm run preview
```

### Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 🔧 Detailed Configuration

### MongoDB Setup

#### Option 1: Local MongoDB

1. **Install MongoDB Community Edition**
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Follow installation instructions for your OS

2. **Start MongoDB Service**
   ```bash
   # macOS (with Homebrew)
   brew services start mongodb-community

   # Linux (systemd)
   sudo systemctl start mongod

   # Windows
   net start MongoDB
   ```

3. **Verify Connection**
   ```bash
   mongosh
   # Should connect to mongodb://localhost:27017
   ```

#### Option 2: MongoDB Atlas (Cloud)

1. **Create Account**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Create Cluster**: Follow the setup wizard
3. **Get Connection String**: 
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
4. **Update Environment**: Use the connection string in `MONGODB_URI`

### Email Configuration

#### Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update Environment Variables**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

#### Alternative Email Services

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
EMAIL_FROM=your_verified_sender@domain.com
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your_mailgun_username
EMAIL_PASS=your_mailgun_password
EMAIL_FROM=your_verified_sender@domain.com
```

### Razorpay Setup

1. **Create Account**: Sign up at [razorpay.com](https://razorpay.com)
2. **Get API Keys**:
   - Go to Dashboard → Settings → API Keys
   - Generate Test/Live keys
3. **Configure Webhooks** (Optional):
   - Go to Dashboard → Settings → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`

## 🐳 Docker Setup

### Development with Docker Compose

1. **Copy Environment File**:
   ```bash
   cp .env.example .env
   ```

2. **Update Environment Variables** in `.env` file

3. **Start All Services**:
   ```bash
   docker-compose up -d
   ```

4. **View Logs**:
   ```bash
   docker-compose logs -f
   ```

5. **Stop Services**:
   ```bash
   docker-compose down
   ```

### Production Docker Deployment

1. **Build Production Images**:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🧪 Testing the Setup

### Backend Testing

1. **Health Check**:
   ```bash
   curl http://localhost:5000/health
   # Should return: {"status":"OK","timestamp":"..."}
   ```

2. **Database Connection**:
   ```bash
   curl http://localhost:5000/api/auth/health
   # Should return database status
   ```

3. **Register Test User**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "password": "TestPass123!",
       "region": "North America",
       "language": "en"
     }'
   ```

### Frontend Testing

1. **Access Application**: Open http://localhost:3000
2. **Test Registration**: Fill out the registration form
3. **Test Login**: Use the login form
4. **Test Navigation**: Check all routes work
5. **Test Responsive Design**: Resize browser window

### Payment Testing

1. **Use Razorpay Test Cards**:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - Name: Any name

2. **Test Payment Flow**:
   - Create payment order
   - Complete payment with test card
   - Verify payment status
   - Check invoice generation

## 🔒 Security Checklist

### Development Security

- [ ] Use strong JWT secrets (minimum 32 characters)
- [ ] Enable HTTPS in production
- [ ] Set secure environment variables
- [ ] Use app passwords for email services
- [ ] Keep API keys secure and never commit to version control

### Production Security

- [ ] Use production Razorpay keys
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start

**Error**: `ECONNREFUSED mongodb://localhost:27017`
- **Solution**: Ensure MongoDB is running
- **Check**: `mongosh` command works
- **Alternative**: Use MongoDB Atlas connection string

**Error**: `JWT_SECRET is required`
- **Solution**: Check `.env` file exists and has JWT_SECRET
- **Verify**: Environment variables are loaded correctly

#### Frontend Won't Connect to Backend

**Error**: `Network Error` or `CORS Error`
- **Solution**: Ensure backend is running on port 5000
- **Check**: `VITE_API_URL` in frontend `.env` file
- **Verify**: Backend CORS configuration allows frontend origin

#### Email OTP Not Sending

**Error**: `Authentication failed` for email
- **Solution**: Check email credentials in `.env`
- **Gmail**: Ensure app password is used, not regular password
- **Verify**: Email service allows less secure apps or use app passwords

#### Payment Integration Issues

**Error**: `Invalid key_id` from Razorpay
- **Solution**: Verify Razorpay key ID in both backend and frontend
- **Check**: Using test keys for development
- **Verify**: Razorpay account is active

### Debug Commands

```bash
# Check backend logs
cd backend && npm run dev

# Check frontend logs
cd frontend/mern-frontend && pnpm run dev

# Check MongoDB connection
mongosh "your_mongodb_connection_string"

# Test API endpoints
curl -X GET http://localhost:5000/health

# Check environment variables
cd backend && node -e "console.log(process.env.JWT_SECRET)"
```

### Getting Help

1. **Check Logs**: Always check console logs for error details
2. **Verify Environment**: Ensure all environment variables are set
3. **Test Components**: Test backend and frontend separately
4. **Check Documentation**: Refer to API documentation
5. **Community Support**: Create GitHub issues for bugs

## 📚 Next Steps

After successful setup:

1. **Explore Features**: Test all application features
2. **Customize**: Modify styling and branding
3. **Add Features**: Extend functionality as needed
4. **Deploy**: Follow deployment guide for production
5. **Monitor**: Set up logging and monitoring
6. **Scale**: Optimize for production load

## 🎯 Production Deployment

For production deployment, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)

---

**Need help?** Create an issue on GitHub or contact support@yourapp.com

