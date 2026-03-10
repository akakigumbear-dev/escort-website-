import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CfThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (
      req.headers?.['cf-connecting-ip'] ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = (request as any).url || (request as any).path || '';
    if (typeof url === 'string' && url.includes('socket.io')) {
      return true;
    }
    return super.canActivate(context);
  }
}
