export interface IRazorpayService {
  createOrder(options: any): Promise<any>;

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean;

  getPayment(paymentId: string): Promise<any>;
  getOrder(orderId: string): Promise<any>;

  capturePayment(paymentId: string, amount: number): Promise<any>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  generateReceiptId(prefix?: string): string;

  convertToSmallestUnit(amount: number, currency?: string): number;
  convertFromSmallestUnit(amount: number, currency?: string): number;

  formatAmount(amount: number, currency?: string): string;

  getSupportedCurrencies(): string[];
  isValidCurrency(currency: string): boolean;
  getMinimumAmount(currency?: string): number;
  isValidAmount(amount: number, currency?: string): boolean;
}
