export interface EmailProvider {
  sendOTP(email: string, otp: string): Promise<void>;
  sendPaymentStatus(email: string, status: string, amount: number): Promise<void>;
  sendExpenseStatus(email: string, status: string, amount: number): Promise<void>;
  sendBillingFinalized(messId: string, month: number, year: number): Promise<void>;
  sendNotice(messId: string, title: string): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async sendOTP(email: string, otp: string) { console.log(`[EmailService/OTP]: OTP ${otp} sent to ${email}`); }
  async sendPaymentStatus(email: string, status: string, amount: number) { console.log(`[EmailService/Payment]: Payment ${status} for ${amount} emailed to ${email}`); }
  async sendExpenseStatus(email: string, status: string, amount: number) { console.log(`[EmailService/Expense]: Expense ${status} for ${amount} emailed to ${email}`); }
  async sendBillingFinalized(messId: string, month: number, year: number) { console.log(`[EmailService/Billing]: finalized ${month}/${year} for mess ${messId}`); }
  async sendNotice(messId: string, title: string) { console.log(`[EmailService/Notice]: Mess ${messId} Notice published: ${title}`); }
}

// Swappable backend (Nodemailer, SendGrid, etc.)
export const emailService: EmailProvider = new ConsoleEmailProvider();
