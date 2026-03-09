import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'database/entities/user.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { UserRole } from 'database/enums/enums';

type RegisterDto = {
  email: string;
  phoneNumber: string;
  password: string;
};

type LoginDto = {
  email: string;
  password: string;
};

type ForgetPasswordDto = {
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EscortProfile)
    private readonly escortProfileRepo: Repository<EscortProfile>,
    private readonly jwt: JwtService,
  ) {}

  private signToken(user: Pick<User, 'id' | 'email'>) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('995') && digits.length >= 12) return digits;
    if (digits.length === 9) return '995' + digits;
    return digits;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = this.normalizePhone(dto.phoneNumber);

    const emailExists = await this.usersRepo.findOne({
      where: { email },
      select: { id: true } as any,
    });
    if (emailExists) {
      throw new BadRequestException('Email already in use');
    }

    const phoneExists = await this.usersRepo.findOne({
      where: { phoneNumber: phone },
      select: { id: true } as any,
    });
    if (phoneExists) {
      throw new BadRequestException('Phone number already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const savedUser = await this.usersRepo.save(
      this.usersRepo.create({
        email,
        phoneNumber: phone,
        password: passwordHash,
      }),
    );

    // Auto-link: if an escort profile with the same phone already exists (and has no user), link it
    const unlinkedProfiles = await this.escortProfileRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('u.id IS NULL')
      .getMany();
    const escortWithPhone = unlinkedProfiles.find(
      (p) => this.normalizePhone(p.phoneNumber || '') === phone,
    );

    let linkedProfile = false;
    if (escortWithPhone) {
      escortWithPhone.user = savedUser;
      await this.escortProfileRepo.save(escortWithPhone);
      savedUser.role = UserRole.ESCORT;
      await this.usersRepo.update(savedUser.id, { role: UserRole.ESCORT });
      linkedProfile = true;
    }

    const accessToken = await this.signToken({
      id: savedUser.id,
      email: savedUser.email,
    });

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        phoneNumber: savedUser.phoneNumber,
        balance: Number(savedUser.balance),
        role: linkedProfile ? UserRole.ESCORT : (savedUser.role ?? UserRole.CLIENT),
      },
      linkedProfile,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.email.trim().toLowerCase();

    // Support login by email or phone
    const isPhone = /^\+?\d{9,15}$/.test(identifier.replace(/\s/g, ''));
    const whereClause = isPhone
      ? { phoneNumber: this.normalizePhone(identifier) }
      : { email: identifier };

    const user = await this.usersRepo.findOne({
      where: whereClause,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        password: true,
        role: true,
        balance: true,
      } as any,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signToken({
      id: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        balance: Number(user.balance),
        role: user.role ?? UserRole.CLIENT,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        balance: true,
      } as any,
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      balance: Number(user.balance),
      role: user.role,
    };
  }

  async deposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    await this.usersRepo
      .createQueryBuilder()
      .update(User)
      .set({ balance: () => `balance + :amount` })
      .setParameter('amount', amount)
      .where('id = :id', { id: userId })
      .execute();

    const user = await this.usersRepo.findOne({
      where: { id: userId },
    });

    return { balance: Number(user!.balance) };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: { id: true, password: true } as any,
    });
    if (!user) throw new BadRequestException('User not found');

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update(userId, { password: hash });
    return { ok: true };
  }

  async forgetPassword(dto: ForgetPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: { email },
      select: { id: true } as any,
    });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersRepo.update(user.id, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: expiresAt,
    } as any);

    return {
      ok: true,
      resetToken: token,
      expiresAt,
    };
  }
}
