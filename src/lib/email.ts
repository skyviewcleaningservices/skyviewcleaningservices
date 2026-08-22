import nodemailer, { Transporter } from 'nodemailer';

interface ReminderDetails {
  to: string;
  name: string;
  serviceType: string;
  lastCleanDate: Date;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private fromAddress: string;

  private constructor() {
    this.fromAddress = process.env.GMAIL_USER || '';

    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public isConfigured(): boolean {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  }

  public async sendReminderEmail(details: ReminderDetails): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email is not configured' };
    }

    const monthsAgo = Math.round(
      (Date.now() - details.lastCleanDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    try {
      await this.transporter.sendMail({
        from: `"SkyView Cleaning Services" <${this.fromAddress}>`,
        to: details.to,
        subject: 'Time for your next SkyView clean?',
        text: `Hi ${details.name},

It's been about ${monthsAgo} month${monthsAgo === 1 ? '' : 's'} since your last ${details.serviceType} with SkyView Cleaning Services. If you'd like to book your next clean, just reply to this email or call us at +91 9623029057.

Thanks for choosing SkyView!`,
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending reminder email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
    }
  }
}

export default EmailService;
