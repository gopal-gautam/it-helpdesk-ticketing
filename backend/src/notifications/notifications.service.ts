import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '1025'),
      secure: false,
      auth: {
        user: process.env.MAIL_USER || 'user',
        pass: process.env.MAIL_PASS || 'pass',
      },
    });
  }

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.content,
        type: dto.type,
        ticketId: dto.ticketId,
        isRead: false,
      },
    });

    await this.sendEmailNotification(dto);

    return notification;
  }

  private async sendEmailNotification(dto: CreateNotificationDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user || !user.email) return;

      await this.transporter.sendMail({
        from: '"IT Helpdesk" <support@helpdesk.com>',
        to: user.email,
        subject: dto.title,
        text: dto.content,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                <h2>${dto.title}</h2>
                <p>${dto.content}</p>
                <br/>
                <a href="http://localhost:3000/tickets" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Ticket
                </a>
              </div>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send email notification to ${dto.userId}: ${error.message}`);
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async findUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }
}
