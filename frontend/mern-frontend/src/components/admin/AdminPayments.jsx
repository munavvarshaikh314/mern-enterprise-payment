import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  adminAPI,
  createCsv,
  downloadFile,
  formatCurrency,
  formatDate,
  paymentAPI,
} from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const statuses = ['all', 'created', 'pending', 'completed', 'failed', 'refunded'];

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    region: 'All Regions',
    status: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-payments', filters],
    queryFn: async () => {
      const params = {
        ...filters,
        region: filters.region === 'All Regions' ? undefined : filters.region,
        status: filters.status === 'all' ? undefined : filters.status,
      };

      const response = await adminAPI.getAllPayments(params);
      return response.data.data;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin-payment-analytics', filters.region],
    queryFn: async () => {
      const response = await adminAPI.getPaymentAnalytics(
        filters.region === 'All Regions' ? undefined : { region: filters.region }
      );
      return response.data.data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ paymentId, reason }) => paymentAPI.refundPayment(paymentId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Refund processed successfully');
      setIsRefundDialogOpen(false);
    },
    onError: (mutationError) => {
      toast.error(mutationError.response?.data?.message || 'Refund failed');
    },
  });

  const payments = data?.payments || [];
  const pagination = data?.pagination || {};

  const summary = useMemo(() => {
    return {
      totalPayments: pagination.totalItems || payments.length,
      completedRevenue: payments
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0),
      averagePayment: analytics?.averagePayment?.avgAmount || 0,
      successRate: analytics?.statusDistribution?.length
        ? ((analytics.statusDistribution.find((item) => item._id === 'completed')?.count || 0) /
            analytics.statusDistribution.reduce((sum, item) => sum + item.count, 0)) *
          100
        : 0,
    };
  }, [analytics, pagination.totalItems, payments]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  const exportPayments = () => {
    const csv = createCsv(
      payments.map((payment) => ({
        paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
        customer: `${payment.userId?.firstName || ''} ${payment.userId?.lastName || ''}`.trim(),
        email: payment.userId?.email || '',
        amount: formatCurrency(payment.amount, payment.currency),
        status: payment.status,
        createdAt: formatDate(payment.createdAt),
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `admin-payments-page-${filters.page}.csv`);
  };

  const handleInvoiceDownload = async (payment) => {
    if (!payment.invoiceId) return;

    const response = await paymentAPI.downloadInvoice(payment.invoiceId);
    downloadFile(response.data, `${payment.invoiceId}.pdf`);
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
          We couldn’t load payment operations right now. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#14b8a6_140%)] p-6 text-white shadow-2xl shadow-emerald-100/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
              Payment operations
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Oversee every transaction</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Search all payments, download invoices, and process refunds without leaving the admin console.
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
            <Button className="rounded-2xl bg-white text-slate-900 hover:bg-white/90" onClick={exportPayments}>
              <Download className="mr-2 h-4 w-4" />
              Export page
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Payments</p>
            <p className="mt-2 text-2xl font-semibold">{summary.totalPayments}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Completed revenue</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.completedRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Average payment</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(Math.round(summary.averagePayment))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Success rate</p>
            <p className="mt-2 text-2xl font-semibold">{summary.successRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="text-xl">Filter payments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              className="rounded-2xl pl-10"
              placeholder="Search by customer, email, order ID, or description"
            />
          </div>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.region} onValueChange={(value) => handleFilterChange('region', value)}>
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
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="text-xl">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {payment.userId?.firstName} {payment.userId?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{payment.userId?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.razorpayPaymentId || payment.razorpayOrderId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="capitalize">{payment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(payment.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>{payment.userId?.region}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="rounded-2xl">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {payment.invoiceId && (
                          <DropdownMenuItem onClick={() => handleInvoiceDownload(payment)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download invoice
                          </DropdownMenuItem>
                        )}
                        {payment.status === 'completed' && (
                          <>
                            {payment.invoiceId && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsRefundDialogOpen(true);
                              }}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              Refund payment
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.currentPage || filters.page} of {pagination.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => handleFilterChange('page', Math.max(filters.page - 1, 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              Refund {selectedPayment ? formatCurrency(selectedPayment.amount, selectedPayment.currency) : ''}
              {' '}for {selectedPayment?.userId?.firstName} {selectedPayment?.userId?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={refundMutation.isPending}
              onClick={() =>
                refundMutation.mutate({
                  paymentId: selectedPayment._id,
                  reason: 'Admin initiated refund',
                })
              }
            >
              {refundMutation.isPending ? 'Processing...' : 'Confirm refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
