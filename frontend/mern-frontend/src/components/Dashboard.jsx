import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, formatCurrency, formatDate } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './LoadingSpinner';

const STATUS_COLORS = ['#f97316', '#14b8a6', '#0f172a', '#f59e0b', '#fb7185'];

const MetricCard = ({ icon: Icon, label, value, helper }) => (
  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
    <CardContent className="flex items-start justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-orange-100 text-orange-600">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await userAPI.getDashboard();
      return response.data.data;
    },
  });

  const paymentStats = data?.paymentStats || {};
  const recentPayments = data?.recentPayments || [];
  const statusDistribution = data?.statusDistribution || [];

  const totalAttempts = statusDistribution.reduce((sum, item) => sum + item.count, 0);
  const successRate = totalAttempts
    ? (statusDistribution.find((item) => item._id === 'completed')?.count || 0) / totalAttempts
    : 0;

  const activityTrend = useMemo(() => {
    return recentPayments
      .slice()
      .reverse()
      .map((payment, index) => ({
        label: `P${index + 1}`,
        amount: payment.amount / 100,
      }));
  }, [recentPayments]);

  const statusChartData = useMemo(() => {
    return statusDistribution.map((item) => ({
      name: item._id,
      value: item.count,
    }));
  }, [statusDistribution]);

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          We couldn’t load your dashboard right now. Please refresh and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_50%,#ea580c_140%)] p-6 text-white shadow-2xl shadow-orange-200/50 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Live account overview
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">
              Welcome back, {user?.firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75 lg:text-base">
              Your payments workspace is synced and ready. Use this view to track revenue,
              spot recent activity, and jump into the next action quickly.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              className="rounded-2xl bg-white text-slate-900 hover:bg-white/90"
              onClick={() => navigate('/payments/create')}
            >
              Create Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/payments')}
            >
              Review Activity
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CreditCard}
          label="Completed payments"
          value={paymentStats.totalPayments || 0}
          helper={`${totalAttempts || 0} total attempts across all statuses`}
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(paymentStats.totalAmount || 0)}
          helper="Captured from successful payments"
        />
        <MetricCard
          icon={TrendingUp}
          label="Average order"
          value={formatCurrency(Math.round(paymentStats.avgAmount || 0))}
          helper="Average amount per completed payment"
        />
        <MetricCard
          icon={Clock3}
          label="Last payment"
          value={paymentStats.lastPayment ? formatDate(paymentStats.lastPayment) : 'No payments yet'}
          helper="Most recent successful transaction"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl">Recent payment momentum</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {activityTrend.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={activityTrend}>
                  <defs>
                    <linearGradient id="dashboardArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#f97316"
                    strokeWidth={3}
                    fill="url(#dashboardArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-background/60 p-12 text-center text-muted-foreground">
                Create your first payment to unlock trends and account activity here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Account health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-[22px] bg-orange-50/80 p-4">
              <div>
                <p className="font-medium">Email verification</p>
                <p className="text-sm text-muted-foreground">Required for secure access</p>
              </div>
              <Badge variant="secondary" className="rounded-full bg-green-100 text-green-700">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-[22px] bg-emerald-50/70 p-4">
              <div>
                <p className="font-medium">Two-factor security</p>
                <p className="text-sm text-muted-foreground">Extra verification at sign-in</p>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white text-emerald-700">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {user?.preferences?.twoFactorAuth ? 'Enabled' : 'Optional'}
              </Badge>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Status mix</p>
              {statusChartData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" innerRadius={52} outerRadius={80}>
                      {statusChartData.map((item, index) => (
                        <Cell key={item.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No payment activity yet.</p>
              )}
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium">Success rate</p>
              <p className="mt-2 text-3xl font-semibold">{(successRate * 100).toFixed(0)}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your completed payments against total attempts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPayments.length ? (
              recentPayments.map((payment) => (
                <div
                  key={payment._id}
                  className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{payment.description || 'Payment order'}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.razorpayPaymentId || payment.razorpayOrderId}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold">{formatCurrency(payment.amount, payment.currency)}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {payment.status} on {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-background/60 p-10 text-center text-muted-foreground">
                No payment activity yet. Once you create your first payment, it will show up here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Next best actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-between rounded-2xl"
              onClick={() => navigate('/payments/create')}
            >
              Create a new payment
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between rounded-2xl"
              onClick={() => navigate('/payments')}
            >
              Review invoices and statuses
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between rounded-2xl"
              onClick={() => navigate('/settings')}
            >
              Strengthen account security
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
