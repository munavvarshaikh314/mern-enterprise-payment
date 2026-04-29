import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail'));
const TwoFactorAuth = lazy(() => import('./components/auth/TwoFactorAuth'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));
const Payments = lazy(() => import('./components/Payments'));
const PaymentCreate = lazy(() => import('./components/PaymentCreate'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const AdminPayments = lazy(() => import('./components/admin/AdminPayments'));
const PaymentDetails = lazy(() => import('./components/PaymentDetails'));

const PageFallback = () => <LoadingSpinner className="min-h-screen" size="lg" />;

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !['admin', 'superadmin'].includes(user?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, requiresTwoFactor } = useAuth();

  if (isLoading) return <PageFallback />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (requiresTwoFactor) return <Navigate to="/verify-2fa" replace />;

  return children;
};

const TwoFactorRoute = () => {
  const { requiresTwoFactor } = useAuth();
  return requiresTwoFactor ? <TwoFactorAuth /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<TwoFactorRoute />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payments/create" element={<PaymentCreate />} />
          <Route path="payments/:paymentId" element={<PaymentDetails />} />

          <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="admin/payments" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
