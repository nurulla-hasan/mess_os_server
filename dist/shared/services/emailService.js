"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
class ConsoleEmailProvider {
    async sendOTP(email, otp) { console.log(`[EmailService/OTP]: OTP ${otp} sent to ${email}`); }
    async sendPaymentStatus(email, status, amount) { console.log(`[EmailService/Payment]: Payment ${status} for ${amount} emailed to ${email}`); }
    async sendExpenseStatus(email, status, amount) { console.log(`[EmailService/Expense]: Expense ${status} for ${amount} emailed to ${email}`); }
    async sendBillingFinalized(messId, month, year) { console.log(`[EmailService/Billing]: finalized ${month}/${year} for mess ${messId}`); }
    async sendNotice(messId, title) { console.log(`[EmailService/Notice]: Mess ${messId} Notice published: ${title}`); }
}
// Swappable backend (Nodemailer, SendGrid, etc.)
exports.emailService = new ConsoleEmailProvider();
