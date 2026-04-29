import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Download,
  Filter,
  ReceiptText,
  Search,
  Sparkles,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createCsv,
  downloadFile,
  formatCurrency,
  formatDate,
  paymentAPI,
} from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';

import toast from "react-hot-toast";
import {
  MoreVertical,
  Copy,
  Eye,
  Mail,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusOptions = ['all', 'created', 'pending', 'completed', 'failed', 'refunded'];

const Payments = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', page, status],
    queryFn: async () => {
      const response = await paymentAPI.getUserPayments({
        page,
        limit: 8,
        status: status === 'all' ? undefined : status,
      });

      return response.data.data;
    },
  });

  const payments = data?.payments || [];
  const pagination = data?.pagination || {};

  const filteredPayments = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return payments;

    return payments.filter((payment) =>
      [payment.description, payment.razorpayPaymentId, payment.razorpayOrderId, payment.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue))
    );
  }, [payments, search]);

  const summary = useMemo(() => {
    return filteredPayments.reduce(
      (accumulator, payment) => {
        accumulator.totalAmount += payment.status === 'completed' ? payment.amount : 0;
        accumulator.completed += payment.status === 'completed' ? 1 : 0;
        accumulator.invoiceReady += payment.invoiceId ? 1 : 0;
        return accumulator;
      },
      { totalAmount: 0, completed: 0, invoiceReady: 0 }
    );
  }, [filteredPayments]);

  const exportCurrentView = () => {
    const csv = createCsv(
      filteredPayments.map((payment) => ({
        paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
        description: payment.description,
        amount: formatCurrency(payment.amount, payment.currency),
        status: payment.status,
        createdAt: formatDate(payment.createdAt),
        invoiceReady: payment.invoiceId ? 'Yes' : 'No',
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `payments-page-${page}.csv`);
  };

  // new query
  const { data: statsData } = useQuery({
  queryKey: ["payment-stats"],
  queryFn: async () => {
    const response = await paymentAPI.getPaymentStats();
    return response.data.data;
  },
});

const stats = statsData || {
  failedPayments: 0,
  pendingPayments: 0,
  refundedPayments: 0,
  totalRevenue: 0,
  thisMonthRevenue: 0,
};

  const handleInvoiceDownload = async (payment) => {
    if (!payment.invoiceId) return;

    const response = await paymentAPI.downloadInvoice(payment.invoiceId);
    downloadFile(response.data, `${payment.invoiceNumber || payment.razorpayOrderId}.pdf`);
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
          We couldn’t load your payments right now. Please try again in a moment.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#0f766e_140%)] p-6 text-white shadow-2xl shadow-emerald-100/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Payments command center
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Track every payment clearly</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Filter by status, search across payment IDs and descriptions, export the current
              view, and download invoices as soon as they’re ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-2xl bg-white text-slate-900 hover:bg-white/90"
              onClick={() => navigate('/payments/create')}
            >
              Create payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={exportCurrentView}
              disabled={!filteredPayments.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export view
            </Button>
          </div>
        </div>
      </section>

     <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Visible payments</p>
      <p className="mt-2 text-2xl font-semibold">{filteredPayments.length}</p>
      <p className="mt-1 text-xs text-muted-foreground">Filtered from page {page}</p>
    </CardContent>
  </Card>

  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Completed value</p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalAmount)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Across visible results</p>
    </CardContent>
  </Card>

  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Pending payments</p>
      <p className="mt-2 text-2xl font-semibold">{stats.pendingPayments}</p>
      <p className="mt-1 text-xs text-muted-foreground">All-time</p>
    </CardContent>
  </Card>

  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Failed payments</p>
      <p className="mt-2 text-2xl font-semibold">{stats.failedPayments}</p>
      <p className="mt-1 text-xs text-muted-foreground">All-time</p>
    </CardContent>
  </Card>

  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Refunded payments</p>
      <p className="mt-2 text-2xl font-semibold">{stats.refundedPayments}</p>
      <p className="mt-1 text-xs text-muted-foreground">All-time</p>
    </CardContent>
  </Card>

  <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">Total revenue</p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrency(stats.totalRevenue)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This month: {formatCurrency(stats.thisMonthRevenue)}
      </p>
    </CardContent>
  </Card>
</div>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5" />
            Filter payments
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by description, order ID, payment ID, or status"
              className="rounded-2xl pl-10"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All statuses' : option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredPayments.length ? (
          filteredPayments.map((payment) => (
            <Card
              key={payment._id}
              className="rounded-[30px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30"
            >
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full capitalize">{payment.status}</Badge>
                    {payment.invoiceId && (
                      <Badge variant="secondary" className="rounded-full">
                        <ReceiptText className="mr-1 h-3.5 w-3.5" />
                        Invoice ready
                      </Badge>

                      


                    )}

                    <div className="flex flex-wrap gap-2">
  {payment.invoiceId && (
    <Button
      variant="outline"
      className="rounded-2xl"
      onClick={() => handleInvoiceDownload(payment)}
    >
      <Download className="mr-2 h-4 w-4" />
      Invoice
    </Button>
  )}

  <Button
    variant="outline"
    className="rounded-2xl"
    onClick={() => navigate(`/payments/create`, { state: { template: payment } })}
  >
    Reuse details
  </Button>

  {/* Actions dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="rounded-2xl px-3">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="rounded-2xl">
      <DropdownMenuItem onClick={() => navigate(`/payments/${payment._id}`)}>
        <Eye className="mr-2 h-4 w-4" />
        View payment details
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => {
          navigator.clipboard.writeText(
            payment.razorpayPaymentId || payment.razorpayOrderId
          );
          toast.success("Payment ID copied");
        }}
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy Payment ID
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={async () => {
          try {
            await paymentAPI.resendReceipt(payment._id);
            toast.success("Receipt resent successfully");
          } catch (err) {
            toast.error("Failed to resend receipt");
          }
        }}
      >
        <Mail className="mr-2 h-4 w-4" />
        Resend receipt
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={async () => {
          try {
            await paymentAPI.markDisputed(payment._id);
            toast.success("Marked as disputed");
          } catch (err) {
            toast.error("Failed to mark disputed");
          }
        }}
      >
        <AlertTriangle className="mr-2 h-4 w-4" />
        Mark as disputed
      </DropdownMenuItem>

      {/* Refund (optional) */}
      {payment.status === "completed" && (
        <DropdownMenuItem
          onClick={async () => {
            try {
              await paymentAPI.refundPayment(payment._id);
              toast.success("Refund initiated successfully");
            } catch (err) {
              toast.error("Refund failed");
            }
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Refund payment
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</div>

                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {payment.description || 'Payment order'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {payment.razorpayPaymentId || payment.razorpayOrderId}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(payment.createdAt)}</p>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <p className="text-2xl font-semibold">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {payment.invoiceId && (
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => handleInvoiceDownload(payment)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Invoice
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => navigate(`/payments/create`, { state: { template: payment } })}
                    >
                      Reuse details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
            <CardContent className="p-12 text-center text-muted-foreground">
              No payments matched this filter. Try another status or create a new payment.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-xl shadow-orange-100/30 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pagination.currentPage || page} of {pagination.totalPages || 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Payments;
