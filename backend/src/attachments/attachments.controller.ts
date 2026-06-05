import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  BadRequestException,
  Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: express.Request,
    @Res() res: express.Response
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const ticketId = (req.body as any).ticketId;
    if (!ticketId) {
      throw new BadRequestException('ticketId is required in the request body');
    }

    const userId = (req as any).user.id;

    const attachment = await this.attachmentsService.create({
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      ticket: { connect: { id: ticketId } },
      uploadedBy: { connect: { id: userId } },
    });

    return res.status(201).json(attachment);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('id') id: string,
    @Res() res: express.Response
  ) {
    const filePath = await this.attachmentsService.getFilePath(id);
    const attachment = await this.attachmentsService.findOne(id);

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);

    return res.sendFile(filePath);
  }

  @Get('ticket/:ticketId')
  @UseGuards(JwtAuthGuard)
  async getTicketAttachments(@Param('ticketId') ticketId: string) {
    return this.attachmentsService.findManyByTicket(ticketId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteAttachment(
    @Param('id') id: string,
    @Req() req: express.Request
  ) {
    const userId = (req as any).user.id;
    await this.attachmentsService.delete(id, userId);
    return { message: 'Attachment deleted successfully' };
  }
}

