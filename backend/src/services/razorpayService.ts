import Razorpay from 'razorpay';
import crypto from 'crypto';
import { RazorpayOrderOptions, RazorpayWebhookEvent } from '../types';



class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials are not configured');
    }

    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log('✅ Razorpay service initialized');
  }

  // Create a new order
  async createOrder(options: RazorpayOrderOptions): Promise<any> {
    try {
      const order = await this.razorpay.orders.create({
        amount: options.amount, // Amount in smallest currency unit (paise for INR)
        currency: options.currency,
        receipt: options.receipt,
        notes: options.notes || {},
      });

      console.log('✅ Razorpay order created:', order.id);
      return order;
    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment signature
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === signature;
      
      if (isValid) {
        console.log('✅ Payment signature verified successfully');
      } else {
        console.log('❌ Payment signature verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying payment signature:', error);
      return false;
    }
  }

  // Get payment details
  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('❌ Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  // Get order details
  async getOrder(orderId: string): Promise<any> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  // Capture payment (for authorized payments)
 async capturePayment(paymentId: string, amount: number) {
  try {
    const capturedPayment = await this.razorpay.payments.capture(
      paymentId,
      amount,
      "INR"
    );

    console.log("✅ Payment captured successfully:", paymentId);
    return capturedPayment;
  } catch (error) {
    console.error("❌ Error capturing payment:", error);
    throw new Error("Failed to capture payment");
  }
}



  // Refund payment
async refundPayment(paymentId: string, amount?: number): Promise<any> {
  try {
    console.log("🔥 Refund PaymentId:", paymentId);

    const options: any = {};

    if (amount) {
      options.amount = amount; // must be paise
    }

    const refund = await this.razorpay.payments.refund(
      paymentId,
      options
    );

    console.log("✅ Refund Success:", refund);
    return refund;
  } catch (error: any) {
    console.error("❌ Razorpay Refund Error:", error?.error || error);
    throw error;
  }
}
  // Verify webhook signature
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }

  // Generate receipt ID
  generateReceiptId(prefix: string = 'ORDER'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  // Convert amount to smallest currency unit
  convertToSmallestUnit(amount: number, currency: string = 'INR'): number {
    switch (currency.toUpperCase()) {
      case 'INR':
        return Math.round(amount * 100); // Convert to paise
      case 'USD':
      case 'EUR':
      case 'GBP':
        return Math.round(amount * 100); // Convert to cents
      default:
        return Math.round(amount * 100);
    }
  }

  // Convert amount from smallest currency unit
  convertFromSmallestUnit(amount: number, currency: string = 'INR'): number {
    switch (currency.toUpperCase()) {
      case 'INR':
        return amount / 100; // Convert from paise
      case 'USD':
      case 'EUR':
      case 'GBP':
        return amount / 100; // Convert from cents
      default:
        return amount / 100;
    }
  }

  // Format amount for display
  formatAmount(amount: number, currency: string = 'INR'): string {
    const convertedAmount = this.convertFromSmallestUnit(amount, currency);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  }

  // Get supported currencies
  getSupportedCurrencies(): string[] {
    return ['INR', 'USD', 'EUR', 'GBP'];
  }

  // Validate currency
  isValidCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  // Get minimum amount for currency
  getMinimumAmount(currency: string = 'INR'): number {
    switch (currency.toUpperCase()) {
      case 'INR':
        return 100; // 1 INR in paise
      case 'USD':
        return 50; // $0.50 in cents
      case 'EUR':
        return 50; // €0.50 in cents
      case 'GBP':
        return 30; // £0.30 in pence
      default:
        return 100;
    }
  }

  // Validate amount
  isValidAmount(amount: number, currency: string = 'INR'): boolean {
    const minAmount = this.getMinimumAmount(currency);
    return amount >= minAmount;
  }

  // Create payment link (for future use)
  async createPaymentLink(options: {
    amount: number;
    currency: string;
    description: string;
    customer: {
      name: string;
      email: string;
      contact?: string;
    };
    notify?: {
      sms?: boolean;
      email?: boolean;
    };
    reminder_enable?: boolean;
    callback_url?: string;
    callback_method?: string;
  }): Promise<any> {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: options.amount,
        currency: options.currency,
        description: options.description,
        customer: options.customer,
        notify: options.notify || { sms: true, email: true },
        reminder_enable: options.reminder_enable || true,
        callback_url: options.callback_url,
        callback_method: options.callback_method || 'get',
      });

      console.log('✅ Payment link created:', paymentLink.id);
      return paymentLink;
    } catch (error) {
      console.error('❌ Error creating payment link:', error);
      throw new Error('Failed to create payment link');
    }
  }
}

export default new RazorpayService();



