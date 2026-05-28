import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mailer.host');
    if (!host) {
      this.logger.warn('SMTP host not configured — emails will be logged only.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('mailer.port'),
      secure: this.config.get<boolean>('mailer.secure'),
      auth: {
        user: this.config.get<string>('mailer.user'),
        pass: this.config.get<string>('mailer.pass'),
      },
    });
  }

  async send(input: SendMailInput): Promise<void> {
    const from = this.config.get<string>('mailer.from');
    if (!this.transporter) {
      this.logger.warn(`[MAIL DRY-RUN] to=${input.to} subject=${input.subject}`);
      return;
    }
    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
