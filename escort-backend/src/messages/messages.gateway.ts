import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

const USER_ROOM_PREFIX = 'user:';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

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
    } catch {
      void client.disconnect();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by OnGatewayDisconnect
  handleDisconnect(_client: Socket) {}

  /** Emit event to a user (all their connected sockets). */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(USER_ROOM_PREFIX + userId).emit(event, data);
  }
}
