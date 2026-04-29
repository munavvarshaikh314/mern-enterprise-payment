const PDFDocument = require("pdfkit");
const fs = require("fs");

const generateInvoice = (paymentData) => {
  const doc = new PDFDocument();
  const filename = `invoice_${paymentData.payment_id}.pdf`;
  const stream = fs.createWriteStream(`./invoices/${filename}`);
  doc.pipe(stream);

  doc.fontSize(18).text("Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Payment ID: ${paymentData.payment_id}`);
  doc.text(`Order ID: ${paymentData.order_id}`);
  doc.text(`Amount Paid: ₹${paymentData.amount / 100}`);
  doc.text(`Date: ${new Date(paymentData.createdAt).toLocaleString()}`);
  doc.end();

  return filename;
};

module.exports = generateInvoice;
