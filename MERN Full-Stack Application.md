# MERN Full-Stack Application

A comprehensive full-stack web application built with modern technologies, featuring secure authentication, payment processing, user management, and analytics dashboard. Perfect for final year CSE students and FAANG-level development practices.

## 🚀 Features

### Core Features
- ✅ **JWT Authentication** with access/refresh tokens
- ✅ **2FA Email OTP** for enhanced security
- ✅ **Secure UPI Payments** via Razorpay integration
- ✅ **PDF Invoice Generation** for all transactions
- ✅ **User Roles** (Admin/User) with protected routes
- ✅ **Region & Language Preferences** for global users
- ✅ **Admin Analytics Dashboard** with comprehensive insights
- ✅ **Real-time Data Visualization** using Recharts
- ✅ **Responsive Design** with modern UI/UX

### Advanced Features
- 🔐 **Enterprise-grade Security** with rate limiting, input validation, and XSS protection
- 📊 **Advanced Analytics** with region filtering and revenue insights
- 🏆 **Top Users by Revenue** tracking and leaderboards
- 📱 **Mobile-responsive** design with touch support
- 🌐 **Multi-language Support** with internationalization
- 📈 **Performance Monitoring** with request logging
- 🔄 **Automatic Token Refresh** for seamless user experience
- 📧 **Email Notifications** for important events

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript support
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for beautiful, accessible components
- **React Router** for client-side routing
- **React Query** for server state management
- **React Hook Form** for form handling
- **Recharts** for data visualization
- **Lucide Icons** for consistent iconography

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Razorpay** for payment processing
- **Nodemailer** for email services
- **PDFKit** for invoice generation
- **Express Rate Limit** for API protection
- **Helmet** for security headers

### DevOps & Deployment
- **Docker** with multi-stage builds
- **Docker Compose** for local development
- **Nginx** as reverse proxy
- **MongoDB** for data persistence
- **Redis** for session storage (optional)

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **pnpm** package manager
- **MongoDB** (local or cloud instance)
- **Git** for version control

### Required API Keys
- **Razorpay** account for payment processing
- **Email service** (Gmail, SendGrid, etc.) for OTP delivery

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mern-fullstack-app.git
cd mern-fullstack-app
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update environment variables in .env file
# Add your MongoDB URI, JWT secrets, email credentials, and Razorpay keys

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend/mern-frontend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Update environment variables in .env file
# Add your API URL and Razorpay key

# Start development server
pnpm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## 🔧 Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/mern_fullstack

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
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

### Frontend Environment Variables

Create a `.env` file in the `frontend/mern-frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=MERN App
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Clone the repository
git clone https://github.com/yourusername/mern-fullstack-app.git
cd mern-fullstack-app

# Copy environment file
cp .env.example .env

# Update environment variables in .env file

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build and deploy for production
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

Comprehensive API documentation is available at:
- **Local**: http://localhost:5000/api-docs
- **File**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Key Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-2fa` - Two-factor authentication
- `POST /api/payments/create` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/admin/dashboard` - Admin analytics
- `GET /api/admin/users/top-by-revenue` - Top users by revenue

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend/mern-frontend

# Run component tests
pnpm test

# Run E2E tests
pnpm run test:e2e
```

## 📊 Project Structure

```
mern-fullstack-app/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   ├── types/          # TypeScript type definitions
│   │   └── server.ts       # Main server file
│   ├── tests/              # Test files
│   ├── uploads/            # File uploads directory
│   ├── Dockerfile          # Docker configuration
│   └── package.json        # Dependencies and scripts
├── frontend/               # React frontend
│   └── mern-frontend/
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── contexts/   # React contexts
│       │   ├── hooks/      # Custom hooks
│       │   ├── lib/        # Utility functions
│       │   └── App.jsx     # Main app component
│       ├── public/         # Static assets
│       ├── Dockerfile      # Docker configuration
│       └── package.json    # Dependencies and scripts
├── nginx/                  # Nginx configuration
├── scripts/                # Deployment scripts
├── docker-compose.yml      # Docker Compose configuration
├── API_DOCUMENTATION.md    # API documentation
└── README.md              # This file
```

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with automatic refresh
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Password hashing with bcrypt
- Session management

### API Security
- Rate limiting per endpoint
- Input validation and sanitization
- XSS protection
- CORS configuration
- Security headers (Helmet.js)
- Request logging and monitoring

### Payment Security
- Razorpay signature verification
- Secure webhook handling
- Payment status validation
- Refund protection
- Transaction logging

## 📈 Analytics Features

### Admin Dashboard
- Total users, revenue, and payments
- Success rate and growth metrics
- Monthly revenue trends
- Payment status distribution
- Regional revenue breakdown

### User Analytics
- Registration trends over time
- User distribution by region
- Email verification statistics
- Two-factor authentication adoption

### Payment Analytics
- Revenue by region filtering
- Top 5 users by revenue
- Payment frequency analysis
- Average transaction values
- Refund and failure tracking

## 🌟 Key Highlights for FAANG Interviews

### System Design
- **Scalable Architecture**: Microservices-ready design with clear separation of concerns
- **Database Design**: Optimized MongoDB schemas with proper indexing
- **Caching Strategy**: Redis integration for session management
- **Load Balancing**: Nginx reverse proxy configuration

### Code Quality
- **TypeScript**: Full type safety across the application
- **Clean Code**: SOLID principles and design patterns
- **Error Handling**: Comprehensive error handling and logging
- **Testing**: Unit, integration, and E2E test coverage

### Performance
- **Optimized Queries**: Efficient database queries with aggregation
- **Lazy Loading**: Component and route-based code splitting
- **Caching**: Browser and server-side caching strategies
- **Compression**: Gzip compression and asset optimization

### Security
- **OWASP Compliance**: Following security best practices
- **Data Protection**: Encryption and secure data handling
- **Audit Logging**: Comprehensive request and action logging
- **Vulnerability Management**: Regular security updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages
- Ensure code passes all linting rules

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing frontend framework
- **Express.js** for the robust backend framework
- **MongoDB** for the flexible database solution
- **Razorpay** for secure payment processing
- **shadcn/ui** for beautiful UI components
- **Tailwind CSS** for utility-first styling

## 📞 Support

For support and questions:
- **Email**: support@yourapp.com
- **Documentation**: [API Documentation](./API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/mern-fullstack-app/issues)

## 🗺️ Roadmap

### Upcoming Features
- [ ] Real-time notifications with WebSocket
- [ ] Advanced analytics with machine learning
- [ ] Multi-currency support
- [ ] Social authentication (Google, GitHub)
- [ ] Advanced user permissions
- [ ] API rate limiting per user
- [ ] Automated testing pipeline
- [ ] Performance monitoring dashboard

---

**Built with ❤️ for learning and professional development**

