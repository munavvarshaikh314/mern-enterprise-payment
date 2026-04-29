import { paymentAPI } from '@/lib/api';

export const openRazorpayCheckout = ({
  order,
  user,
}: {
  order: any;
  user: any;
}) => {
  return new Promise<any>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'));
      return;
    }

    const rzp = new window.Razorpay({
      key: order.key, // public key
      amount: order.amount,
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: 'MERN Payments',
      description: order.description,
      prefill: {
        name: user.firstName,
        email: user.email,
      },
      handler: async (response: any) => {
        try {
          const verification = await paymentAPI.verifyPayment(response);
          resolve(verification.data?.data ?? verification.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment checkout was cancelled')),
      },
    });

    rzp.open();
  });
};
