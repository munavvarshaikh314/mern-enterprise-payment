# MERN Full-Stack Application - Testing Guide

This guide provides comprehensive testing strategies and procedures for the MERN Full-Stack Application.

## 🧪 Testing Overview

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few)
  /____\    
 /      \   Integration Tests (Some)
/________\  Unit Tests (Many)
```

### Testing Types Covered

1. **Unit Tests**: Individual components and functions
2. **Integration Tests**: API endpoints and database operations
3. **End-to-End Tests**: Complete user workflows
4. **Security Tests**: Authentication and authorization
5. **Performance Tests**: Load and stress testing
6. **Manual Tests**: User experience validation

## 🔧 Test Setup

### Backend Testing Setup

```bash
cd backend

# Install test dependencies
npm install --save-dev jest supertest @types/jest @types/supertest

# Create test database
# Update .env.test file
cp .env .env.test
```

**Test Environment Configuration (`.env.test`):**

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/mern_fullstack_test
JWT_SECRET=test_jwt_secret_for_testing_only
JWT_REFRESH_SECRET=test_refresh_secret_for_testing_only
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=test@ethereal.email
EMAIL_PASS=test_password
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=test_secret
```

### Frontend Testing Setup

```bash
cd frontend/mern-frontend

# Install test dependencies
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom

# Install E2E testing
pnpm add -D playwright @playwright/test
```

## 🧪 Unit Tests

### Backend Unit Tests

**Example: User Model Test (`backend/tests/models/User.test.ts`)**

```typescript
import { User } from '../../src/models/User';
import { connectDB, disconnectDB } from '../setup/database';

describe('User Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.isEmailVerified).toBe(false);
      expect(savedUser.role).toBe('user');
    });

    it('should not create user with invalid email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should not create user with weak password', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: '123', // Weak password
        region: 'North America',
        language: 'en'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password Methods', () => {
    it('should hash password before saving', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      });

      await user.save();
      expect(user.password).not.toBe('SecurePass123!');
      expect(user.password.length).toBeGreaterThan(50);
    });

    it('should validate correct password', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      });

      await user.save();
      const isValid = await user.comparePassword('SecurePass123!');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      });

      await user.save();
      const isValid = await user.comparePassword('WrongPassword');
      expect(isValid).toBe(false);
    });
  });
});
```

### Frontend Unit Tests

**Example: Login Component Test (`frontend/src/components/__tests__/Login.test.jsx`)**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Login from '../auth/Login';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  it('renders login form', () => {
    render(<Login />, { wrapper: createWrapper() });
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<Login />, { wrapper: createWrapper() });
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<Login />, { wrapper: createWrapper() });
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockLogin = jest.fn();
    
    render(<Login onLogin={mockLogin} />, { wrapper: createWrapper() });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    });
  });
});
```

## 🔗 Integration Tests

### API Integration Tests

**Example: Authentication API Test (`backend/tests/integration/auth.test.ts`)**

```typescript
import request from 'supertest';
import { app } from '../../src/server';
import { User } from '../../src/models/User';
import { connectDB, disconnectDB } from '../setup/database';

describe('Authentication API', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.data.email).toBe(userData.email);

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.isEmailVerified).toBe(false);
    });

    it('should not register user with existing email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      };

      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create verified user for login tests
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en',
        isEmailVerified: true
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('john@example.com');
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login unverified user', async () => {
      // Create unverified user
      const user = new User({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en',
        isEmailVerified: false
      });
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'SecurePass123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verify your email');
    });
  });
});
```

## 🎭 End-to-End Tests

### Playwright E2E Tests

**Example: User Registration Flow (`frontend/tests/e2e/registration.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should complete registration successfully', async ({ page }) => {
    // Fill registration form
    await page.fill('[data-testid="firstName"]', 'John');
    await page.fill('[data-testid="lastName"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john@example.com');
    await page.selectOption('[data-testid="region"]', 'North America');
    await page.selectOption('[data-testid="language"]', 'en');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="confirmPassword"]', 'SecurePass123!');

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Should redirect to email verification
    await expect(page).toHaveURL('/verify-email');
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    // Submit empty form
    await page.click('[data-testid="submit-button"]');

    // Check for validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.fill('[data-testid="password"]', '123');
    await page.blur('[data-testid="password"]');

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="confirmPassword"]', 'DifferentPass123!');
    await page.blur('[data-testid="confirmPassword"]');

    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });
});

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create payment successfully', async ({ page }) => {
    // Navigate to payments
    await page.click('[data-testid="payments-link"]');
    await page.click('[data-testid="create-payment-button"]');

    // Fill payment form
    await page.fill('[data-testid="amount"]', '1000');
    await page.fill('[data-testid="description"]', 'Test payment');
    await page.click('[data-testid="create-order-button"]');

    // Should show Razorpay checkout
    await expect(page.locator('.razorpay-container')).toBeVisible();
  });
});
```

## 🔒 Security Tests

### Authentication Security Tests

```typescript
describe('Security Tests', () => {
  describe('JWT Token Security', () => {
    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject expired JWT tokens', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: 'test_user_id' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token expired');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize XSS attempts', async () => {
      const maliciousData = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'SecurePass123!',
        region: 'North America',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user.firstName).not.toContain('<script>');
    });

    it('should prevent NoSQL injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

## 📊 Performance Tests

### Load Testing with Artillery

**Create `artillery.yml`:**

```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "Authentication flow"
    weight: 70
    flow:
      - post:
          url: "/api/auth/register"
          json:
            firstName: "Load"
            lastName: "Test"
            email: "loadtest{{ $randomNumber() }}@example.com"
            password: "SecurePass123!"
            region: "North America"
            language: "en"
      - post:
          url: "/api/auth/login"
          json:
            email: "loadtest{{ $randomNumber() }}@example.com"
            password: "SecurePass123!"

  - name: "API endpoints"
    weight: 30
    flow:
      - get:
          url: "/health"
      - get:
          url: "/api/auth/health"
```

**Run Load Tests:**

```bash
npm install -g artillery
artillery run artillery.yml
```

## 🧪 Manual Testing Checklist

### User Registration & Authentication

- [ ] **Registration Form**
  - [ ] All fields validate correctly
  - [ ] Password strength indicator works
  - [ ] Region and language dropdowns populate
  - [ ] Form submission shows loading state
  - [ ] Success message appears after registration

- [ ] **Email Verification**
  - [ ] OTP email is sent
  - [ ] OTP verification works
  - [ ] Resend OTP functionality works
  - [ ] Invalid OTP shows error
  - [ ] Expired OTP shows error

- [ ] **Login Process**
  - [ ] Valid credentials allow login
  - [ ] Invalid credentials show error
  - [ ] Unverified users cannot login
  - [ ] 2FA flow works (if enabled)
  - [ ] Remember me functionality

### Payment Integration

- [ ] **Payment Creation**
  - [ ] Payment form validates amount
  - [ ] Razorpay checkout opens
  - [ ] Test cards work correctly
  - [ ] Payment success redirects properly
  - [ ] Payment failure shows error

- [ ] **Invoice Generation**
  - [ ] PDF invoice is generated
  - [ ] Invoice contains correct details
  - [ ] Download functionality works
  - [ ] Invoice number is unique

### Admin Dashboard

- [ ] **Analytics Display**
  - [ ] Charts render correctly
  - [ ] Data filters work
  - [ ] Region filtering functions
  - [ ] Date range filtering works
  - [ ] Export functionality works

- [ ] **User Management**
  - [ ] User list displays correctly
  - [ ] Search functionality works
  - [ ] Role updates work
  - [ ] User deletion works (with confirmation)

### Responsive Design

- [ ] **Mobile Devices**
  - [ ] All pages render correctly
  - [ ] Touch interactions work
  - [ ] Navigation menu works
  - [ ] Forms are usable

- [ ] **Tablet Devices**
  - [ ] Layout adapts properly
  - [ ] Charts remain readable
  - [ ] Tables scroll horizontally

- [ ] **Desktop**
  - [ ] Full functionality available
  - [ ] Optimal layout utilization
  - [ ] Keyboard navigation works

## 🚀 Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Frontend Tests

```bash
cd frontend/mern-frontend

# Run unit tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run E2E tests
pnpm run test:e2e

# Run E2E tests in headed mode
pnpm run test:e2e:headed
```

### Full Test Suite

```bash
# Run all tests (from project root)
npm run test:all

# Run tests in CI mode
npm run test:ci
```

## 📊 Test Coverage Goals

### Coverage Targets

- **Unit Tests**: > 80% code coverage
- **Integration Tests**: > 70% API endpoint coverage
- **E2E Tests**: > 90% critical user journey coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## 🐛 Debugging Tests

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is running
   - Check connection string in `.env.test`
   - Clear test data between tests

2. **Async Test Failures**
   - Use proper async/await syntax
   - Increase test timeouts if needed
   - Mock external API calls

3. **Frontend Test Issues**
   - Ensure proper component wrapping
   - Mock API calls and contexts
   - Use proper test utilities

### Debug Commands

```bash
# Debug backend tests
npm run test:debug

# Debug frontend tests with browser
pnpm run test:debug

# Run single test file
npm test -- --testNamePattern="specific test name"
```

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install backend dependencies
        run: cd backend && npm ci
        
      - name: Run backend tests
        run: cd backend && npm test
        
      - name: Install frontend dependencies
        run: cd frontend/mern-frontend && pnpm install
        
      - name: Run frontend tests
        run: cd frontend/mern-frontend && pnpm test
        
      - name: Run E2E tests
        run: cd frontend/mern-frontend && pnpm run test:e2e
```

---

**Happy Testing! 🧪** Comprehensive testing ensures a robust and reliable application.

