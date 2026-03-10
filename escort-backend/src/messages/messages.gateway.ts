import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'database/entities/user.entity';
import type { Socket } from 'socket.io';

const USER_ROOM_PREFIX = 'user:';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((s: string) => s.trim()).filter(Boolean),
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private socketCount = new Map<string, number>();

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace?.('Bearer ', '');
    if (!token) {
      void client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      const userId = payload?.sub;
      if (!userId) {
        void client.disconnect();
        return;
      }
      (client as any).userId = userId;
      client.join(USER_ROOM_PREFIX + userId);

      const prev = this.socketCount.get(userId) ?? 0;
      this.socketCount.set(userId, prev + 1);

      if (prev === 0) {
        this.userRepo
          .update(userId, { isOnline: true, lastSeen: new Date() })
          .catch(() => {});
        this.server.emit('user-status', { userId, online: true });
      }
    } catch {
      void client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    if (!userId) return;

    const count = (this.socketCount.get(userId) ?? 1) - 1;
    if (count <= 0) {
      this.socketCount.delete(userId);
      this.markOffline(userId);
    } else {
      this.socketCount.set(userId, count);
    }
  }

  @SubscribeMessage('go-offline')
  handleGoOffline(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    if (!userId) return;
    this.socketCount.delete(userId);
    this.markOffline(userId);
    void client.disconnect();
  }

  private markOffline(userId: string) {
    const now = new Date();
    this.userRepo
      .update(userId, { isOnline: false, lastSeen: now })
      .catch(() => {});
    this.server.emit('user-status', {
      userId,
      online: false,
      lastSeen: now.toISOString(),
    });
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(USER_ROOM_PREFIX + userId).emit(event, data);
  }
}
