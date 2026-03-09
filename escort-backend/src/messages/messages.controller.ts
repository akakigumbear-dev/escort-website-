import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { dmAttachmentMulterOptions } from 'src/common/multer.config';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment', dmAttachmentMulterOptions))
  async sendMessage(
    @Req() req: { user: { userId: string } },
    @Body() body: { receiverId: string; content?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body?.receiverId) {
      throw new BadRequestException('receiverId required');
    }
    const msg = await this.messagesService.sendMessage(
      req.user.userId,
      body.receiverId,
      body.content?.trim() || null,
      file ? `/uploads/dm/${file.filename}` : null,
      file?.originalname || null,
    );
    const msgPayload = {
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      attachmentPath: msg.attachmentPath,
      attachmentOriginalName: msg.attachmentOriginalName,
      createdAt:
        msg.createdAt instanceof Date
          ? msg.createdAt.toISOString()
          : msg.createdAt,
    };
    this.messagesGateway.emitToUser(body.receiverId, 'message', msgPayload);

    const unread = await this.messagesService.getUnreadCount(body.receiverId);
    this.messagesGateway.emitToUser(body.receiverId, 'notification', {
      type: 'new_message',
      unreadCount: unread,
      from: req.user.userId,
      preview: msg.content?.slice(0, 80) || (msg.attachmentPath ? '📎 Attachment' : ''),
    });

    return msg;
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: { userId: string } }) {
    return this.messagesService.getUnreadCount(req.user.userId).then((count) => ({ count }));
  }

  @Get('conversations')
  getConversations(@Req() req: { user: { userId: string } }) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Post('read/:userId')
  markRead(
    @Req() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) otherUserId: string,
  ) {
    return this.messagesService.markConversationRead(
      req.user.userId,
      otherUserId,
    );
  }

  @Get('with/:userId')
  getMessagesWith(
    @Req() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) otherUserId: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.messagesService.getMessagesWith(
      req.user.userId,
      otherUserId,
      isNaN(limit) ? 50 : limit,
      before,
    );
  }

  @Get('attachment/*path')
  getAttachment(
    @Param('path') rawPath: string | string[],
    @Res() res: Response,
  ) {
    const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    const fullPath = join(process.cwd(), 'uploads', 'dm', path);
    if (!existsSync(fullPath)) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Disposition', 'inline');
    createReadStream(fullPath).pipe(res);
  }
}
