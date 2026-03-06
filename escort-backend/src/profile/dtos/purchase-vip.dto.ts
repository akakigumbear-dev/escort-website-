import { IsInt, Min } from 'class-validator';

export class PurchaseVipDto {
  @IsInt()
  @Min(1)
  days!: number; // რამდენი დღით VIP
}