import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Message } from 'database/entities/message.entity';
import { User } from 'database/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string | null,
    attachmentPath: string | null,
    attachmentOriginalName: string | null,
  ) {
    if (senderId === receiverId) {
      throw new ForbiddenException('Cannot message yourself');
    }
    const receiver = await this.userRepo.findOne({
      where: { id: receiverId },
    });
    if (!receiver) throw new NotFoundException('User not found');

    const msg = this.messageRepo.create({
      senderId,
      receiverId,
      content: content?.trim() || null,
      attachmentPath: attachmentPath || null,
      attachmentOriginalName: attachmentOriginalName || null,
    });
    return this.messageRepo.save(msg);
  }

  async getConversations(userId: string) {
    const sent = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.senderId = :userId', { userId })
      .select('m.receiverId')
      .distinct(true)
      .getRawMany();
    const received = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.receiverId = :userId', { userId })
      .select('m.senderId')
      .distinct(true)
      .getRawMany();

    const otherIds = new Set<string>();
    sent.forEach((r) => otherIds.add(r.m_receiverId));
    received.forEach((r) => otherIds.add(r.m_senderId));

    const others = await this.userRepo.find({
      where: { id: In([...otherIds]) },
      select: { id: true, email: true },
    });
    const userMap = new Map(others.map((u) => [u.id, u]));

    const conversations: Array<{
      userId: string;
      email: string;
      lastMessage: {
        content: string | null;
        hasAttachment: boolean;
        createdAt: Date;
      };
      unreadCount?: number;
    }> = [];

    for (const otherId of otherIds) {
      const last = await this.messageRepo.findOne({
        where: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId },
        ],
        order: { createdAt: 'DESC' },
      });
      if (!last) continue;
      const other = userMap.get(otherId);
      if (!other) continue;
      conversations.push({
        userId: other.id,
        email: other.email,
        lastMessage: {
          content: last.content,
          hasAttachment: !!last.attachmentPath,
          createdAt: last.createdAt,
        },
      });
    }

    for (const conv of conversations) {
      const unread = await this.messageRepo.count({
        where: {
          senderId: conv.userId,
          receiverId: userId,
          isRead: false,
        },
      });
      conv.unreadCount = unread;
    }

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );
    return conversations;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepo.count({
      where: { receiverId: userId, isRead: false },
    });
  }

  async markConversationRead(
    userId: string,
    otherUserId: string,
  ): Promise<{ marked: number }> {
    const result = await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('"receiverId" = :userId AND "senderId" = :otherId AND "isRead" = false', {
        userId,
        otherId: otherUserId,
      })
      .execute();
    return { marked: result.affected ?? 0 };
  }

  async getMessagesWith(
    userId: string,
    otherUserId: string,
    limit: number = 50,
    before?: string,
  ) {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :userId AND m.receiverId = :otherId) OR (m.senderId = :otherId AND m.receiverId = :userId)',
        { userId, otherId: otherUserId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(limit + 1);

    if (before) {
      qb.andWhere('m.createdAt < :before', { before });
    }

    const messages = await qb.getMany();
    const hasMore = messages.length > limit;
    const list = hasMore ? messages.slice(0, limit) : messages;
    list.reverse();

    return {
      messages: list.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        attachmentPath: m.attachmentPath,
        attachmentOriginalName: m.attachmentOriginalName,
        createdAt: m.createdAt,
      })),
      hasMore,
    };
  }
}
