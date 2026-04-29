import nodemailer from 'nodemailer';
import { EmailOptions } from '../types';

class EmailService {
  private transporter: nodemailer.Transporter;

 constructor() {
  this.transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  if (process.env.NODE_ENV === 'production') {
    this.verifyConnection();
  }
}

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"MERN App" <${process.env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  async sendOTPEmail(email: string, otp: string, type: string): Promise<boolean> {
    const subject = this.getOTPSubject(type);
    const html = this.generateOTPEmailHTML(otp, type);
    const text = this.generateOTPEmailText(otp, type);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const subject = 'Welcome to MERN App!';
    const html = this.generateWelcomeEmailHTML(firstName);
    const text = this.generateWelcomeEmailText(firstName);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, otp: string): Promise<boolean> {
    const subject = 'Password Reset Request';
    const html = this.generatePasswordResetEmailHTML(otp);
    const text = this.generatePasswordResetEmailText(otp);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPaymentConfirmationEmail(
    email: string,
    firstName: string,
    amount: number,
    currency: string,
    invoiceUrl?: string
  ): Promise<boolean> {
    const subject = 'Payment Confirmation';
    const html = this.generatePaymentConfirmationEmailHTML(firstName, amount, currency, invoiceUrl);
    const text = this.generatePaymentConfirmationEmailText(firstName, amount, currency);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private getOTPSubject(type: string): string {
    switch (type) {
      case 'email_verification':
        return 'Verify Your Email Address';
      case 'password_reset':
        return 'Password Reset Request';
      case 'two_factor':
        return 'Two-Factor Authentication Code';
      default:
        return 'Verification Code';
    }
  }

  private generateOTPEmailHTML(otp: string, type: string): string {
    const title = this.getOTPSubject(type);
    const message = this.getOTPMessage(type);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; 
                     background: white; padding: 20px; margin: 20px 0; border-radius: 8px; 
                     letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; 
                    border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MERN App</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="otp-code">${otp}</div>
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 MERN App. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOTPEmailText(otp: string, type: string): string {
    const title = this.getOTPSubject(type);
    const message = this.getOTPMessage(type);

    return `
      ${title}
      
      ${message}
      
      Your verification code: ${otp}
      
      Important:
      - This code will expire in 10 minutes
      - Do not share this code with anyone
      - If you didn't request this, please ignore this email
      
      © 2024 MERN App. All rights reserved.
    `;
  }

  private getOTPMessage(type: string): string {
    switch (type) {
      case 'email_verification':
        return 'Please use the following code to verify your email address:';
      case 'password_reset':
        return 'Please use the following code to reset your password:';
      case 'two_factor':
        return 'Please use the following code to complete your login:';
      default:
        return 'Please use the following verification code:';
    }
  }

  private generateWelcomeEmailHTML(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MERN App</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to MERN App!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Thank you for joining MERN App. Your account has been successfully created and verified.</p>
            <p>You can now enjoy all the features of our platform:</p>
            <ul>
              <li>Secure payments with Razorpay</li>
              <li>Two-factor authentication</li>
              <li>Personalized dashboard</li>
              <li>Invoice generation</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 MERN App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(firstName: string): string {
    return `
      Welcome to MERN App!
      
      Hello ${firstName}!
      
      Thank you for joining MERN App. Your account has been successfully created and verified.
      
      You can now enjoy all the features of our platform:
      - Secure payments with Razorpay
      - Two-factor authentication
      - Personalized dashboard
      - Invoice generation
      
      If you have any questions, feel free to contact our support team.
      
      © 2024 MERN App. All rights reserved.
    `;
  }

  private generatePasswordResetEmailHTML(otp: string): string {
    return this.generateOTPEmailHTML(otp, 'password_reset');
  }

  private generatePasswordResetEmailText(otp: string): string {
    return this.generateOTPEmailText(otp, 'password_reset');
  }

  private generatePaymentConfirmationEmailHTML(
    firstName: string,
    amount: number,
    currency: string,
    invoiceUrl?: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Convert from smallest unit

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; 
                   color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Your payment has been successfully processed.</p>
            <div class="amount">${formattedAmount}</div>
            <p>Thank you for your payment. Your transaction has been completed successfully.</p>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}" class="button">Download Invoice</a></p>` : ''}
            <p>If you have any questions about this payment, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 MERN App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentConfirmationEmailText(
    firstName: string,
    amount: number,
    currency: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);

    return `
      Payment Successful!
      
      Hello ${firstName}!
      
      Your payment has been successfully processed.
      
      Amount: ${formattedAmount}
      
      Thank you for your payment. Your transaction has been completed successfully.
      
      If you have any questions about this payment, please contact our support team.
      
      © 2024 MERN App. All rights reserved.
    `;
  }
}

export default new EmailService();

