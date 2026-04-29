import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentAPI, formatCurrency, formatDate, downloadFile } from "@/lib/api";
import LoadingSpinner from "./LoadingSpinner";

export default function PaymentDetails() {
  const navigate = useNavigate();
  const { paymentId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-details", paymentId],
    queryFn: async () => {
      const res = await paymentAPI.getPaymentDetails(paymentId);
      return res.data.data;
    },
    enabled: !!paymentId,
  });

  const payment = data?.payment;
  const invoice = data?.invoice;

  const handleInvoiceDownload = async () => {
    if (!invoice?.id) return;

    const response = await paymentAPI.downloadInvoice(invoice.id);
    downloadFile(response.data, `${invoice.invoiceNumber}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center text-muted-foreground">
        Payment not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="rounded-2xl"
        onClick={() => navigate("/payments")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to payments
      </Button>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment Details
            <Badge className="rounded-full capitalize">{payment.status}</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-lg font-semibold">{payment.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(payment.amount, payment.currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-lg font-semibold">{formatDate(payment.createdAt)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="text-sm font-medium">{payment.razorpayOrderId}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Payment ID</p>
              <p className="text-sm font-medium">
                {payment.razorpayPaymentId || "Not paid yet"}
              </p>
            </div>
          </div>

          {invoice?.id && (
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={handleInvoiceDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </Button>
            </div>
          )}

          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Metadata</p>
            <pre className="mt-2 overflow-auto rounded-xl bg-black/90 p-4 text-xs text-white">
              {JSON.stringify(payment.metadata || {}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}