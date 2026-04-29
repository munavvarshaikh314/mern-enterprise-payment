const generateInvoice = require("./generateInvoice");
const sendPaymentEmail = require("./mailer");

await sendPaymentEmail("user@example.com", savedPayment);

const filename = generateInvoice(savedPayment);
console.log("PDF invoice generated:", filename);

app.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const generated_signature = hmac.digest("hex");

  if (generated_signature === razorpay_signature) {
    // Save to DB
    await Payment.create({
  order_id: razorpay_order_id,
  payment_id: razorpay_payment_id,
  signature: razorpay_signature,
  amount: 10000,
  currency: "INR",
  verified: true,
  userId: req.user?.id || null // only if logged in
});


    res.json({ status: "success" });
  } else {
    res.status(400).json({ status: "failure", reason: "Invalid signature" });
  }
});
