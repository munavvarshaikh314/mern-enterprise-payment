import { Response } from 'express';
import Payment from '../models/Payment';
import Transaction from '../models/postgres/Transaction';
import sequelize from '../config/postgres';
import Invoice from '../models/Invoice';
import User from '../models/User';
import razorpayService from '../services/razorpayService';
import pdfService from '../services/pdfService';
import emailService from '../services/emailService';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../middleware/errorHandler';
import path from 'path';
import { Op } from "sequelize";

// Create a new payment order
export const createPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { amount, currency, description, items } = req.body;

  // Validate currency
  if (!razorpayService.isValidCurrency(currency)) {
    res.status(400).json(createErrorResponse('Invalid currency'));
    return;
  }

  // Convert amount to smallest currency unit
  const amountInSmallestUnit = razorpayService.convertToSmallestUnit(amount, currency);

  // Validate minimum amount
  if (!razorpayService.isValidAmount(amountInSmallestUnit, currency)) {
    const minAmount = razorpayService.getMinimumAmount(currency);
    const minAmountFormatted = razorpayService.formatAmount(minAmount, currency);
    res.status(400).json(createErrorResponse(`Minimum amount is ${minAmountFormatted}`));
    return;
  }

  // Generate receipt ID
  const receipt = razorpayService.generateReceiptId('ORDER');

  try {
    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder({
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      receipt,
      notes: {
        userId: user._id.toString(),
        userEmail: user.email,
        description,
      },
    });

    // Create payment record in MongoDB (for high-volume/logs)
    const payment = new Payment({
      userId: user._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      status: 'created',
      description,
      metadata: {
        items,
        receipt,
        razorpayOrderData: razorpayOrder,
      },
    });
    await payment.save();

    // Create transactional record in PostgreSQL (for ACID compliance)
    await Transaction.create({
      userId: user._id.toString(),
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      description,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending',
    });

    res.status(201).json(createSuccessResponse(
      'Payment order created successfully',
      {
        paymentId: payment._id,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInSmallestUnit,
        currency: currency.toUpperCase(),
        description,
        key: process.env.RAZORPAY_KEY_ID,
        order: razorpayOrder,
      }
    ));
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json(createErrorResponse('Failed to create payment order'));
  }
});

// Verify payment and generate invoice
export const verifyPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    
    if (!payment) {
      res.status(404).json(createErrorResponse('Payment not found'));
      return;
    }

    // Verify user ownership
    if (!payment.userId.equals(user._id)) {
      res.status(403).json(createErrorResponse('Unauthorized access to payment'));
      return;
    }

    // Verify payment signature
    const isSignatureValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      payment.status = 'failed';
      await payment.save();
      res.status(400).json(createErrorResponse('Invalid payment signature'));
      return;
    }

    // Get payment details from Razorpay
    const razorpayPayment = await razorpayService.getPayment(razorpay_payment_id);

    // Update payment record in MongoDB
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'completed';
    payment.metadata = {
      ...payment.metadata,
      razorpayPaymentData: razorpayPayment,
    };
    await payment.save();

    // Update transactional record in PostgreSQL within a transaction
    const t = await sequelize.transaction();
    try {
      await Transaction.update(
        { 
          status: 'completed', 
          razorpayPaymentId: razorpay_payment_id,
          metadata: { signature: razorpay_signature }
        },
        { 
          where: { razorpayOrderId: razorpay_order_id },
          transaction: t 
        }
      );
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    

    // Generate invoice
    const invoice = await generateInvoiceForPayment(payment, user);
    const invoiceUrl = invoice.pdfPath ? pdfService.getInvoiceUrl(path.basename(invoice.pdfPath)) : null;

    payment.invoiceUrl = invoiceUrl || undefined;
    payment.metadata = {
      ...payment.metadata,
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
    };
    await payment.save();

    // Send payment confirmation email
    await emailService.sendPaymentConfirmationEmail(
      user.email,
      user.firstName,
      payment.amount,
      payment.currency,
      invoiceUrl || undefined
    );

    res.json(createSuccessResponse(
      'Payment verified successfully',
      {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          pdfUrl: invoiceUrl,
        },
      }
    ));
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json(createErrorResponse('Failed to verify payment'));
  }
});


// GET /api/payments/stats 
export const getPaymentStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [pendingCount, failedCount, refundedCount] = await Promise.all([
    Transaction.count({ where: { userId: user._id.toString(), status: "pending" } }),
    Transaction.count({ where: { userId: user._id.toString(), status: "failed" } }),
    Transaction.count({ where: { userId: user._id.toString(), status: "refunded" } }),
  ]);

  const totalRevenue = await Transaction.sum("amount", {
    where: { userId: user._id.toString(), status: "completed" },
  });

  const thisMonthRevenue = await Transaction.sum("amount", {
    where: {
      userId: user._id.toString(),
      status: "completed",
      createdAt: { [Op.gte]: startOfMonth },
    },
  });

  res.json(
    createSuccessResponse("Payment stats fetched successfully", {
      pendingCount,
      failedCount,
      refundedCount,
      totalRevenue: totalRevenue || 0,
      thisMonthRevenue: thisMonthRevenue || 0,
    })
  );
});


// Get user's payments
export const getUserPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const sort = req.query.sort as string || '-createdAt';

  const query: any = { userId: user._id };
  
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  try {
    const payments = await Payment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const paymentIds = payments.map((payment) => payment._id);
    const invoices = paymentIds.length
      ? await Invoice.find({ paymentId: { $in: paymentIds } })
          .select('_id paymentId invoiceNumber pdfPath')
          .lean()
      : [];

    const invoiceMap = new Map(
      invoices.map((invoice) => [invoice.paymentId.toString(), invoice])
    );

    const total = await Payment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const enrichedPayments = payments.map((payment) => {
      const invoice = invoiceMap.get(payment._id.toString());

      return {
        ...payment,
        invoiceId: invoice?._id || null,
        invoiceNumber: invoice?.invoiceNumber || null,
        invoiceUrl:
          payment.invoiceUrl ||
          (invoice?.pdfPath ? pdfService.getInvoiceUrl(path.basename(invoice.pdfPath)) : null),
      };
    });

    res.json(createSuccessResponse(
      'Payments retrieved successfully',
      {
        payments: enrichedPayments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      }
    ));
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json(createErrorResponse('Failed to fetch payments'));
  }
});

// Get payment details
export const getPaymentDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { paymentId } = req.params;

  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      res.status(404).json(createErrorResponse('Payment not found'));
      return;
    }

    // Verify user ownership or admin access
    // Verify user ownership
if (!payment.userId.equals(user._id)) {
  res.status(403).json(createErrorResponse('Unauthorized access to payment'));
  return;
}


    // Get associated invoice if exists
    const invoice = await Invoice.findOne({ paymentId: payment._id });

    res.json(createSuccessResponse(
      'Payment details retrieved successfully',
      {
        payment,
        invoice: invoice ? {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          pdfUrl: invoice.pdfPath ? pdfService.getInvoiceUrl(path.basename(invoice.pdfPath)) : null,
        } : null,
      }
    ));
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json(createErrorResponse('Failed to fetch payment details'));
  }
});

// Download invoice
export const downloadInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { invoiceId } = req.params;

  try {
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      res.status(404).json(createErrorResponse('Invoice not found'));
      return;
    }

    // Verify user ownership or admin access
    // Verify user ownership or admin access
if (!invoice.userId.equals(user._id) && user.role !== 'admin') {

  res.status(403).json(createErrorResponse('Unauthorized access to payment'));
  return;
}


    if (!invoice.pdfPath) {
      res.status(404).json(createErrorResponse('Invoice PDF not found'));
      return;
    }

    const pdfBuffer = await pdfService.getInvoiceBuffer(invoice.pdfPath);
    
    if (!pdfBuffer) {
      res.status(404).json(createErrorResponse('Invoice file not found'));
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json(createErrorResponse('Failed to download invoice'));
  }
});

// isdisputed 

// PATCH /api/payments/:paymentId/dispute
export const markPaymentDisputed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    res.status(404).json(createErrorResponse("Payment not found"));
    return;
  }

  if (!payment.userId.equals(user._id) && user.role !== "admin") {
    res.status(403).json(createErrorResponse("Unauthorized"));
    return;
  }

  payment.isDisputed = true;
  await payment.save();

  res.json(createSuccessResponse("Payment marked as disputed", payment));
});

// resend invoice reciept email
// POST /api/payments/:paymentId/resend-receipt
export const resendReceipt = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    res.status(404).json(createErrorResponse("Payment not found"));
    return;
  }

  if (!payment.userId.equals(user._id) && user.role !== "admin") {
    res.status(403).json(createErrorResponse("Unauthorized"));
    return;
  }

  const invoice = await Invoice.findOne({ paymentId: payment._id });

  const invoiceUrl = invoice?.pdfPath
    ? pdfService.getInvoiceUrl(path.basename(invoice.pdfPath))
    : payment.invoiceUrl;

  await emailService.sendPaymentConfirmationEmail(
    user.email,
    user.firstName,
    payment.amount,
    payment.currency,
    invoiceUrl || undefined
  );

  res.json(createSuccessResponse("Receipt email resent successfully"));
});

// Refund payment (admin only)
export const refundPayment = asyncHandler(
  
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (amount && amount <= 0) {
  res.status(400).json(createErrorResponse("Invalid refund amount"));
  return;
}




    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        res.status(404).json(createErrorResponse("Payment not found"));
        return;
      }

      if (payment.status !== "completed") {
        res
          .status(400)
          .json(createErrorResponse("Only completed payments can be refunded"));
        return;
      }

      if (!payment.razorpayPaymentId) {
        res.status(400).json(createErrorResponse("Payment ID not found"));
        return;
      }

      // ✅ amount from frontend should be in RUPEES
      let refundAmountInPaise: number | undefined = undefined;

      if (amount !== undefined && amount !== null) {
        const numericAmount = Number(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
          res.status(400).json(createErrorResponse("Invalid refund amount"));
          return;
        }

        refundAmountInPaise = razorpayService.convertToSmallestUnit(
          numericAmount,
          payment.currency
        );

        // ✅ safety check: refund should not exceed original payment
        if (refundAmountInPaise > payment.amount) {
          res
            .status(400)
            .json(createErrorResponse("Refund amount cannot exceed payment amount"));
          return;
        }
      }

      // ✅ Process refund with Razorpay
      const refund = await razorpayService.refundPayment(
        payment.razorpayPaymentId,
        refundAmountInPaise
      );

      // ✅ Update payment status
      payment.status = "refunded";
      payment.metadata = {
        ...payment.metadata,
        refund: {
          refundId: refund.id,
          amount: refund.amount,
          reason: reason || "No reason provided",
          processedAt: new Date(),
        },
      };

      await payment.save();

      // ✅ Update PostgreSQL transaction
      await Transaction.update(
        { status: "refunded" },
        { where: { razorpayPaymentId: payment.razorpayPaymentId } }
      );

      res.json(
        createSuccessResponse("Payment refunded successfully", {
          paymentId: payment._id,
          refundId: refund.id,
          refundAmount: refund.amount,
          status: payment.status,
        })
      );
    } catch (error: any) {
  console.error("❌ Refund Full Error:", error);

  res.status(500).json({
    success: false,
    message: "Refund failed",
    razorpayError: error?.error || error?.response?.data || error,
  });

  return;
}
  }
);

// Helper function to generate invoice for payment
async function generateInvoiceForPayment(payment: any, user: any): Promise<any> {
  const rawItems = Array.isArray(payment.metadata?.items) ? payment.metadata.items : [];
  const fallbackItem = {
    name: payment.description || 'Payment',
    description: 'Payment charge',
    quantity: 1,
    price: payment.amount,
    total: payment.amount,
  };

  let normalizedItems = rawItems
    .map((item: any) => {
      const quantity = Math.max(Number(item.quantity) || 1, 1);
      const price = razorpayService.convertToSmallestUnit(Number(item.price) || 0, payment.currency);

      return {
        name: item.name || payment.description || 'Payment',
        description: item.description || '',
        quantity,
        price,
        total: quantity * price,
      };
    })
    .filter((item: any) => item.total > 0);

  const normalizedTotal = normalizedItems.reduce((sum: number, item: any) => sum + item.total, 0);

  if (!normalizedItems.length || normalizedTotal !== payment.amount) {
    normalizedItems = [fallbackItem];
  }

  // Create invoice
  const invoice = new Invoice({
    paymentId: payment._id,
    userId: user._id,
    amount: payment.amount,
    currency: payment.currency,
    items: normalizedItems,
    billingAddress: {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || '',
      address: user.address || {
        street: 'N/A',
        city: 'N/A',
        state: 'N/A',
        country: 'N/A',
        zipCode: 'N/A',
      },
    },
  });

  await invoice.save();

  // Generate PDF
  try {
    const pdfPath = await pdfService.generateInvoice(invoice, user);
    invoice.pdfPath = pdfPath;
    await invoice.save();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
  }

  return invoice;
}
