import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1 ₾' })
  amount!: number;
}
