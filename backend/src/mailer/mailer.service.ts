import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import * as nodemailer from 'nodemailer';
import { IsString, IsInt, IsBoolean, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class UpsertSmtpDto {
  @IsString()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @IsString()
  @IsOptional()
  username?: string;

  // Plaintext password from the form; encrypted before persisting.
  // Send empty/undefined to keep the existing stored password unchanged.
  @IsString()
  @IsOptional()
  password?: string;

  @IsEmail()
  fromEmail: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// AES-256-GCM at-rest encryption for the SMTP password.
const ENC_KEY = scryptSync(
  process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'helpdesk-default-key',
  'helpdesk-smtp-salt',
  32,
);

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) return '';
  const decipher = createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private prisma: PrismaService) {}

  /** Returns the active SMTP config WITHOUT the password (safe for the UI). */
  async getConfig() {
    const cfg = await this.prisma.smtpConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!cfg) return null;
    const { password, ...safe } = cfg;
    return { ...safe, hasPassword: !!password };
  }

  /** Single-row config: update if one exists, otherwise create. */
  async upsertConfig(dto: UpsertSmtpDto) {
    const existing = await this.prisma.smtpConfig.findFirst({ orderBy: { createdAt: 'asc' } });

    const data: any = {
      host: dto.host,
      port: dto.port,
      secure: dto.secure ?? false,
      username: dto.username ?? null,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName ?? 'IT Helpdesk',
      isActive: dto.isActive ?? true,
    };

    // Only re-encrypt when a new password was supplied.
    if (dto.password) {
      data.password = encrypt(dto.password);
    }

    const saved = existing
      ? await this.prisma.smtpConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.smtpConfig.create({ data });

    const { password, ...safe } = saved;
    return { ...safe, hasPassword: !!password };
  }

  private async buildTransport() {
    const cfg = await this.prisma.smtpConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!cfg || !cfg.isActive) return null;

    return {
      cfg,
      transporter: nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.username && cfg.password
          ? { user: cfg.username, pass: decrypt(cfg.password) }
          : undefined,
      }),
    };
  }

  /** Verifies the SMTP connection and records the result. */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const built = await this.buildTransport();
    if (!built) return { ok: false, error: 'No active SMTP configuration' };

    try {
      await built.transporter.verify();
      await this.prisma.smtpConfig.update({
        where: { id: built.cfg.id },
        data: { lastTestedAt: new Date(), lastTestOk: true },
      });
      return { ok: true };
    } catch (err: any) {
      await this.prisma.smtpConfig.update({
        where: { id: built.cfg.id },
        data: { lastTestedAt: new Date(), lastTestOk: false },
      });
      return { ok: false, error: err?.message ?? 'Connection failed' };
    }
  }

  /**
   * Best-effort send. Never throws — email failures must not break ticket flows.
   */
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!to) return false;
    const built = await this.buildTransport();
    if (!built) {
      this.logger.warn(`SMTP not configured; skipping email "${subject}" to ${to}`);
      return false;
    }
    try {
      await built.transporter.sendMail({
        from: `"${built.cfg.fromName}" <${built.cfg.fromEmail}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email "${subject}" to ${to}: ${err?.message}`);
      return false;
    }
  }
}
