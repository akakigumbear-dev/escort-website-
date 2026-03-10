import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'database/entities/user.entity';

const UPDATE_INTERVAL_MS = 60_000; // only write to DB once per minute per user
const recentlyUpdated = new Map<string, number>();

@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.userId;

    if (userId) {
      const now = Date.now();
      const last = recentlyUpdated.get(userId) ?? 0;
      if (now - last > UPDATE_INTERVAL_MS) {
        recentlyUpdated.set(userId, now);
        this.userRepo.update(userId, { lastSeen: new Date() }).catch(() => {});
      }
    }

    return next.handle();
  }
}
