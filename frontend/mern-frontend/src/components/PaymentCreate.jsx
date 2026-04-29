import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, ReceiptIndianRupee, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { openRazorpayCheckout } from '@/hooks/useRazorpay';
import { paymentAPI } from '@/lib/api';

const createEmptyItem = () => ({
  name: '',
  quantity: 1,
  price: 0,
});

const PaymentCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template;

  const [description, setDescription] = useState(template?.description || 'Service payment');
  const [currency, setCurrency] = useState(template?.currency || 'INR');
  const [items, setItems] = useState(() => {
    if (!template) return [createEmptyItem()];

    return [
      {
        name: template.description || 'Repeated payment',
        quantity: 1,
        price: Math.round((template.amount || 0) / 100),
      },
    ];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  }, [items]);

  const canSubmit =
    description.trim() &&
    total > 0 &&
    items.every((item) => item.name.trim() && Number(item.quantity) > 0 && Number(item.price) > 0);

  const updateItem = (index, key, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()]);
  };

  const removeItem = (index) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;

    setIsSubmitting(true);

    try {
      const payload = {
        amount: Math.round(total),
        currency,
        description: description.trim(),
        items: items.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
      };

      const response = await paymentAPI.createPayment(payload);
      await openRazorpayCheckout({
        order: response.data.data,
        user,
      });

      toast.success('Payment completed successfully');
      navigate('/payments');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Payment failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#f0fdfa_100%)] p-6 shadow-xl shadow-orange-100/40">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Payment builder
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create a clean checkout in minutes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add line items, confirm the amount, and send your customer into a secure Razorpay
          checkout flow with invoice generation built in.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Payment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="description">Payment description</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Website build, consulting retainer, subscription renewal..."
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button variant="outline" className="rounded-2xl" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add item
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={`${index}-${item.name}`}
                  className="grid gap-3 rounded-[24px] border border-border/70 bg-background/70 p-4 md:grid-cols-[1.4fr_120px_140px_auto]"
                >
                  <Input
                    value={item.name}
                    onChange={(event) => updateItem(index, 'name', event.target.value)}
                    placeholder="Item name"
                    className="rounded-2xl"
                  />
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    placeholder="Qty"
                    className="rounded-2xl"
                  />
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.price}
                    onChange={(event) => updateItem(index, 'price', event.target.value)}
                    placeholder="Price"
                    className="rounded-2xl"
                  />
                  <Button
                    variant="ghost"
                    className="rounded-2xl"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardHeader>
            <CardTitle className="text-xl">Checkout summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#111827,#1f2937)] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Charge total</p>
              <p className="mt-3 text-4xl font-semibold">
                <ReceiptIndianRupee className="mr-1 inline h-8 w-8" />
                {total.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-white/70">{items.length} line items</p>
            </div>

            <div className="space-y-3 rounded-[24px] border border-border/70 bg-background/70 p-4">
              {items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name || `Item ${index + 1}`}</p>
                    <p className="text-muted-foreground">
                      {item.quantity} x {item.price || 0} {currency}
                    </p>
                  </div>
                  <p className="font-medium">
                    {((Number(item.quantity) || 0) * (Number(item.price) || 0)).toLocaleString()} {currency}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border border-border/70 bg-emerald-50/70 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p>
                  The amount is sent to the backend first, which creates the Razorpay order and
                  verifies the payment before generating the invoice.
                </p>
              </div>
            </div>

            <Button className="w-full rounded-2xl" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? 'Preparing checkout...' : 'Proceed to secure checkout'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCreate;
