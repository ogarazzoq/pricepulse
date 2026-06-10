import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailWithTemplateInput {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private templateCache: Map<string, { html: HandlebarsTemplateDelegate; text?: HandlebarsTemplateDelegate }> = new Map();

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

  async sendMail(input: SendMailWithTemplateInput): Promise<void> {
    const from = this.config.get<string>('mailer.from') || 'noreply@pricepulse.local';
    
    // Add current year to context
    const context = {
      ...input.context,
      year: new Date().getFullYear(),
    };

    // Render templates
    const { html, text } = await this.renderTemplate(input.template, context);

    if (!this.transporter) {
      this.logger.warn(`[MAIL DRY-RUN] to=${input.to} subject=${input.subject}`);
      return;
    }

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html,
      text,
    });
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<{ html: string; text?: string }> {
    // Check cache
    if (!this.templateCache.has(templateName)) {
      await this.loadTemplate(templateName);
    }

    const templates = this.templateCache.get(templateName);
    if (!templates) {
      throw new Error(`Template ${templateName} not found`);
    }

    const html = templates.html(context);
    const text = templates.text ? templates.text(context) : undefined;

    return { html, text };
  }

  private async loadTemplate(templateName: string): Promise<void> {
    const viewsDir = path.join(process.cwd(), 'views', 'emails');
    const htmlPath = path.join(viewsDir, `${templateName}.hbs`);
    const textPath = path.join(viewsDir, `${templateName}.txt`);

    // Load HTML template (required)
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML template not found: ${htmlPath}`);
    }
    const htmlSource = fs.readFileSync(htmlPath, 'utf-8');
    const htmlTemplate = Handlebars.compile(htmlSource);

    // Load text template (optional)
    let textTemplate: HandlebarsTemplateDelegate | undefined;
    if (fs.existsSync(textPath)) {
      const textSource = fs.readFileSync(textPath, 'utf-8');
      textTemplate = Handlebars.compile(textSource);
    }

    this.templateCache.set(templateName, {
      html: htmlTemplate,
      text: textTemplate,
    });

    this.logger.log(`Loaded email template: ${templateName}`);
  }
}
