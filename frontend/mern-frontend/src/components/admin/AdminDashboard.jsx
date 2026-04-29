import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { adminAPI, createCsv, downloadFile, formatCurrency, formatDate } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LoadingSpinner from '../LoadingSpinner';

const regions = [
  'All Regions',
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Australia',
  'Antarctica',
];

const COLORS = ['#f97316', '#14b8a6', '#0f172a', '#f59e0b', '#fb7185'];

const AdminDashboard = () => {
  const [filters, setFilters] = useState({
    region: 'All Regions',
    startDate: '',
    endDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    region: 'All Regions',
    startDate: '',
    endDate: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard', appliedFilters],
    queryFn: async () => {
      const params = {};
      if (appliedFilters.region !== 'All Regions') params.region = appliedFilters.region;
      if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;

      const response = await adminAPI.getAnalyticsDashboard(params);
      return response.data.data;
    },
  });

  const analytics = data?.analytics || {};
  const growth = data?.growth || {};
  const statusDistribution = data?.statusDistribution || [];
  const recentPayments = data?.recentPayments || [];

  const statusChartData = useMemo(
    () =>
      statusDistribution.map((item) => ({
        name: item.status,
        value: item.count,
      })),
    [statusDistribution]
  );

  const topUsers = useMemo(
    () =>
      (analytics.topUsers || []).map((user) => ({
        ...user,
        name: `${user.firstName} ${user.lastName}`,
      })),
    [analytics.topUsers]
  );

  const exportSnapshot = () => {
    const csv = createCsv(
      recentPayments.map((payment) => ({
        user: `${payment.userId?.firstName || ''} ${payment.userId?.lastName || ''}`.trim(),
        email: payment.userId?.email || '',
        amount: formatCurrency(payment.amount, payment.currency),
        status: payment.status,
        createdAt: formatDate(payment.createdAt),
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const next = { region: 'All Regions', startDate: '', endDate: '' };
    setFilters(next);
    setAppliedFilters(next);
  };

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
          We couldn’t load the admin dashboard right now. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#f97316_140%)] p-6 text-white shadow-2xl shadow-orange-100/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
              Admin analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">See how the platform is moving</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Revenue, user growth, payment health, and recent activity all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              className="rounded-2xl bg-white text-slate-900 hover:bg-white/90"
              onClick={exportSnapshot}
              disabled={!recentPayments.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export recent activity
            </Button>
          </div>
        </div>
      </section>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5" />
            Dashboard filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={filters.region} onValueChange={(value) => setFilters((current) => ({ ...current, region: value }))}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="rounded-2xl"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button className="flex-1 rounded-2xl" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total users</p>
              <p className="mt-2 text-2xl font-semibold">{analytics.totalUsers || 0}</p>
            </div>
            <Users className="h-5 w-5 text-orange-600" />
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(analytics.totalRevenue || 0)}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {growth.revenue >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                )}
                {Math.abs(growth.revenue || 0).toFixed(1)}% versus prior period
              </p>
            </div>
            <Wallet className="h-5 w-5 text-orange-600" />
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Payments</p>
            <p className="mt-2 text-2xl font-semibold">{analytics.totalPayments || 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Average order value</p>
            <p className="mt-2 text-2xl font-semibold">
              {analytics.totalPayments
                ? formatCurrency(Math.round((analytics.totalRevenue || 0) / analytics.totalPayments))
                : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Monthly revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={analytics.monthlyRevenue || []}>
                <defs>
                  <linearGradient id="adminRevenueArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${Math.round(value / 100)}`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={3}
                  fill="url(#adminRevenueArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Payment status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" innerRadius={54} outerRadius={94}>
                  {statusChartData.map((item, index) => (
                    <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Revenue by region</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics.regionStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" />
                <YAxis tickFormatter={(value) => `₹${Math.round(value / 100)}`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                <Bar dataKey="revenue" fill="#14b8a6" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Top users by revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.length ? (
              topUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-[22px] border border-border/70 bg-background/70 p-4"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(user.totalRevenue)}</p>
                    <p className="text-sm text-muted-foreground">{user.totalPayments} payments</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No user revenue data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="text-xl">Recent payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentPayments.length ? (
            recentPayments.map((payment) => (
              <div
                key={payment._id}
                className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {payment.userId?.firstName} {payment.userId?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{payment.userId?.email}</p>
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
            <p className="text-sm text-muted-foreground">No recent payments to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
