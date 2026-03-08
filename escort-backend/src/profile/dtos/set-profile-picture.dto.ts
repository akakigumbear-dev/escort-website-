import { IsUUID } from 'class-validator';

export class SetProfilePictureDto {
  @IsUUID()
  pictureId!: string;
}
