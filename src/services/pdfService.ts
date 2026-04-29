import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IInvoice, IUser } from '../types';

class PDFService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('✅ Created invoices directory:', this.uploadsDir);
    }
  }

  async generateInvoice(invoice: IInvoice, user: IUser): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const filePath = path.join(this.uploadsDir, fileName);

        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoice.invoiceNumber}`,
            Author: 'MERN App',
            Subject: 'Invoice',
            Creator: 'MERN App Invoice System',
          }
        });

        // Pipe the PDF to a file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add content to the PDF
        this.addHeader(doc);
        this.addCompanyInfo(doc);
        this.addInvoiceInfo(doc, invoice);
        this.addBillingInfo(doc, invoice);
        this.addItemsTable(doc, invoice);
        this.addTotals(doc, invoice);
        this.addFooter(doc);

        // Finalize the PDF
        doc.end();

        stream.on('finish', () => {
          console.log('✅ Invoice PDF generated:', fileName);
          resolve(filePath);
        });

        stream.on('error', (error) => {
          console.error('❌ Error generating invoice PDF:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error in PDF generation:', error);
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument): void {
    // Company logo placeholder (you can add actual logo here)
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text('MERN APP', 50, 50, { align: 'left' });

    // Invoice title
    doc.fontSize(20)
       .fillColor('#1f2937')
       .text('INVOICE', 400, 50, { align: 'right' });

    // Add a line separator
    doc.moveTo(50, 100)
       .lineTo(550, 100)
       .strokeColor('#e5e7eb')
       .stroke();
  }

  private addCompanyInfo(doc: PDFKit.PDFDocument): void {
    const startY = 120;

    doc.fontSize(12)
       .fillColor('#374151')
       .text('MERN App Technologies', 50, startY)
       .text('123 Tech Street', 50, startY + 15)
       .text('Silicon Valley, CA 94000', 50, startY + 30)
       .text('United States', 50, startY + 45)
       .text('Email: contact@mernapp.com', 50, startY + 60)
       .text('Phone: +1 (555) 123-4567', 50, startY + 75);
  }

  private addInvoiceInfo(doc: PDFKit.PDFDocument, invoice: IInvoice): void {
    const startY = 120;
    const startX = 350;

    doc.fontSize(12)
       .fillColor('#374151')
       .text('Invoice Number:', startX, startY, { continued: true })
       .fillColor('#1f2937')
       .text(` ${invoice.invoiceNumber}`, { continued: false })
       
       .fillColor('#374151')
       .text('Invoice Date:', startX, startY + 20, { continued: true })
       .fillColor('#1f2937')
       .text(` ${new Date(invoice.createdAt).toLocaleDateString()}`, { continued: false })
       
       .fillColor('#374151')
       .text('Currency:', startX, startY + 40, { continued: true })
       .fillColor('#1f2937')
       .text(` ${invoice.currency}`, { continued: false });
  }

  private addBillingInfo(doc: PDFKit.PDFDocument, invoice: IInvoice): void {
    const startY = 250;

    // Bill To section
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Bill To:', 50, startY);

    doc.fontSize(12)
       .fillColor('#374151')
       .text(invoice.billingAddress.name, 50, startY + 25)
       .text(invoice.billingAddress.email, 50, startY + 40);

    if (invoice.billingAddress.phone) {
      doc.text(invoice.billingAddress.phone, 50, startY + 55);
    }

    // Address
    const address = invoice.billingAddress.address;
    let addressY = startY + (invoice.billingAddress.phone ? 70 : 55);
    
    doc.text(address.street, 50, addressY)
       .text(`${address.city}, ${address.state} ${address.zipCode}`, 50, addressY + 15)
       .text(address.country, 50, addressY + 30);
  }

  private addItemsTable(doc: PDFKit.PDFDocument, invoice: IInvoice): void {
    const startY = 380;
    const tableTop = startY;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 400;
    const totalX = 480;

    // Table header
    doc.fontSize(12)
       .fillColor('#374151')
       .text('Item', itemCodeX, tableTop)
       .text('Description', descriptionX, tableTop)
       .text('Qty', quantityX, tableTop)
       .text('Price', priceX, tableTop)
       .text('Total', totalX, tableTop);

    // Header line
    doc.moveTo(itemCodeX, tableTop + 20)
       .lineTo(totalX + 70, tableTop + 20)
       .strokeColor('#e5e7eb')
       .stroke();

    // Table rows
    let currentY = tableTop + 35;
    
    invoice.items.forEach((item, index) => {
      const formattedPrice = this.formatCurrency(item.price, invoice.currency);
      const formattedTotal = this.formatCurrency(item.total, invoice.currency);

      doc.fontSize(10)
         .fillColor('#1f2937')
         .text(item.name, itemCodeX, currentY, { width: 90 })
         .text(item.description || '', descriptionX, currentY, { width: 180 })
         .text(item.quantity.toString(), quantityX, currentY)
         .text(formattedPrice, priceX, currentY)
         .text(formattedTotal, totalX, currentY);

      currentY += 25;

      // Add line separator between items
      if (index < invoice.items.length - 1) {
        doc.moveTo(itemCodeX, currentY - 5)
           .lineTo(totalX + 70, currentY - 5)
           .strokeColor('#f3f4f6')
           .stroke();
      }
    });

    // Bottom line
    doc.moveTo(itemCodeX, currentY + 5)
       .lineTo(totalX + 70, currentY + 5)
       .strokeColor('#e5e7eb')
       .stroke();
  }

  private addTotals(doc: PDFKit.PDFDocument, invoice: IInvoice): void {
    const startY = 550;
    const labelX = 400;
    const valueX = 480;

    let currentY = startY;

    // Subtotal
    const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
    doc.fontSize(11)
       .fillColor('#374151')
       .text('Subtotal:', labelX, currentY)
       .fillColor('#1f2937')
       .text(this.formatCurrency(subtotal, invoice.currency), valueX, currentY);

    currentY += 20;

    // Discount
    if (invoice.discount && invoice.discount.amount > 0) {
      doc.fillColor('#374151')
         .text('Discount:', labelX, currentY)
         .fillColor('#dc2626')
         .text(`-${this.formatCurrency(invoice.discount.amount, invoice.currency)}`, valueX, currentY);
      
      currentY += 20;
    }

    // Tax
    if (invoice.tax && invoice.tax.amount > 0) {
      doc.fillColor('#374151')
         .text(`Tax (${invoice.tax.rate}%):`, labelX, currentY)
         .fillColor('#1f2937')
         .text(this.formatCurrency(invoice.tax.amount, invoice.currency), valueX, currentY);
      
      currentY += 20;
    }

    // Total line
    doc.moveTo(labelX, currentY + 5)
       .lineTo(valueX + 70, currentY + 5)
       .strokeColor('#374151')
       .lineWidth(1)
       .stroke();

    currentY += 15;

    // Total amount
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Total:', labelX, currentY)
       .text(this.formatCurrency(invoice.amount, invoice.currency), valueX, currentY);
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const footerY = 700;

    // Payment terms
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text('Payment Terms:', 50, footerY)
       .text('Payment is due within 30 days of invoice date.', 50, footerY + 15)
       .text('Thank you for your business!', 50, footerY + 35);

    // Company footer
    doc.text('MERN App - Secure Payment Solutions', 50, footerY + 60, { align: 'center' })
       .text('Generated on ' + new Date().toLocaleString(), 50, footerY + 75, { align: 'center' });
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  }

  async deleteInvoice(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Invoice PDF deleted:', filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error deleting invoice PDF:', error);
      return false;
    }
  }

  getInvoiceUrl(fileName: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/invoices/${fileName}`;
  }

  async getInvoiceBuffer(filePath: string): Promise<Buffer | null> {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
      return null;
    } catch (error) {
      console.error('❌ Error reading invoice PDF:', error);
      return null;
    }
  }
}

export default new PDFService();

