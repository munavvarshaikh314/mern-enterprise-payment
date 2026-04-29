import mongoose, {
  Schema,
  Types,
  HydratedDocument,
  Model
} from 'mongoose';
import { IInvoice } from '../types';

/* -------------------------------------------------------------------------- */
/*                                  Subschemas                                 */
/* -------------------------------------------------------------------------- */

const itemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const taxSchema = new Schema(
  {
    rate: { type: Number, required: true, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const discountSchema = new Schema(
  {
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  { _id: false }
);

const billingAddressSchema = new Schema(
  {
    name: String,
    email: String,
    phone: String,
    address: addressSchema,
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/*                               Invoice Schema                                */
/* -------------------------------------------------------------------------- */

interface InvoiceModel extends Model<IInvoice> {
  generateInvoiceNumber(): Promise<string>;
}

const invoiceSchema = new Schema<IInvoice, InvoiceModel>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR',
    },
    items: {
      type: [itemSchema],
      required: true,
    },
    tax: {
      type: taxSchema,
      default: null,
    },
    discount: {
      type: discountSchema,
      default: null,
    },
    billingAddress: {
      type: billingAddressSchema,
      required: true,
    },
    pdfPath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/*                                   Indexes                                   */
/* -------------------------------------------------------------------------- */

invoiceSchema.index({ paymentId: 1 });
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ createdAt: -1 });

/* -------------------------------------------------------------------------- */
/*                                Static Methods                               */
/* -------------------------------------------------------------------------- */

invoiceSchema.statics.generateInvoiceNumber = async function (): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^INV-${year}${month}-`),
  }).sort({ invoiceNumber: -1 });

  const nextSeq =
    lastInvoice?.invoiceNumber
      ? parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1
      : 1;

  return `INV-${year}${month}-${String(nextSeq).padStart(4, '0')}`;
};

/* -------------------------------------------------------------------------- */
/*                                Pre-save Hook                                */
/* -------------------------------------------------------------------------- */

invoiceSchema.pre(
  'save',
  async function (this: HydratedDocument<IInvoice>, next) {
    try {
      if (!this.invoiceNumber) {
        this.invoiceNumber = await (this.constructor as InvoiceModel)
          .generateInvoiceNumber();
      }

      let subtotal = 0;

      for (const item of this.items) {
        const expected = item.quantity * item.price;
        if (Math.abs(item.total - expected) > 0.01) {
          throw new Error(`Item total mismatch for ${item.name}`);
        }
        subtotal += item.total;
      }

      let expectedTotal = subtotal;

      if (this.discount) {
        expectedTotal -= this.discount.amount;
      }

      if (this.tax) {
        expectedTotal += this.tax.amount;
      }

      if (Math.abs(this.amount - expectedTotal) > 0.01) {
        throw new Error('Invoice total mismatch');
      }

      next();
    } catch (err) {
      next(err as Error);
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                               Instance Methods                              */
/* -------------------------------------------------------------------------- */

invoiceSchema.methods.getSubtotal = function (): number {
  return this.items.reduce(
    (sum: number, item: { total: number }) => sum + item.total,
    0
  );
};

invoiceSchema.methods.calculateTotal = function (): number {
  let total = this.getSubtotal();
  if (this.discount) total -= this.discount.amount;
  if (this.tax) total += this.tax.amount;
  return Math.round(total * 100) / 100;
};

invoiceSchema.methods.getFormattedNumber = function (): string {
  return this.invoiceNumber!;
};

invoiceSchema.methods.getAgeInDays = function (): number {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/* -------------------------------------------------------------------------- */
/*                                   Export                                    */
/* -------------------------------------------------------------------------- */

const Invoice = mongoose.model<IInvoice, InvoiceModel>(
  'Invoice',
  invoiceSchema
);

export default Invoice;
