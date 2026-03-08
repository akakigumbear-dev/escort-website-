import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Req,
  UseGuards,
  Delete,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';
import { CreateEscortProfileDto } from './dtos/create-escort-profile.dto';
import { UpdateEscortProfileDto } from './dtos/update-escort-profile.dto';
import { UpsertPricesDto } from './dtos/upsert-prices.dto';
import { UpdatePricesDto } from './dtos/update-prices.dto';
import { PurchaseVipDto } from './dtos/purchase-vip.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { escortPicturesMulterOptions } from 'src/common/multer.config';
import { SetProfilePictureDto } from './dtos/set-profile-picture.dto';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly escort: ProfileService) {}

  @Post('create')
  createEscortProfile(@Req() req: any, @Body() dto: CreateEscortProfileDto) {
    return this.escort.createEscortProfile(req.user.userId, dto);
  }

  @Get('get')
  getEscortProfile(@Req() req: any) {
    return this.escort.getMyEscortProfile(req.user.userId);
  }

  @Patch('edit')
  editEscortProfile(@Req() req: any, @Body() dto: UpdateEscortProfileDto) {
    return this.escort.editEscortProfile(req.user.userId, dto);
  }

  @Post('verify')
  activateEscortProfile(@Req() req: any) {
    return this.escort.activateEscortProfile(req.user.userId);
  }

  @Post('vip/purchase')
  purchaseVipProfile(@Req() req: any, @Body() dto: PurchaseVipDto) {
    return this.escort.purchaseVipProfile(req.user.userId, dto);
  }

  @Post('prices')
  createPrices(@Req() req: any, @Body() dto: UpsertPricesDto) {
    return this.escort.upsertPrices(req.user.userId, dto);
  }

  @Patch('prices/:id')
  editPrices(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePricesDto,
  ) {
    return this.escort.editPrices(req.user.userId, id, dto);
  }

  @Post('pictures/upload')
  @UseInterceptors(
    FilesInterceptor('pictures', 20, escortPicturesMulterOptions),
  )
  uploadPictures(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.escort.uploadPictures(req.user.userId, files);
  }

  @Delete('pictures/:pictureId')
  deletePicture(
    @Req() req: any,
    @Param('pictureId', new ParseUUIDPipe()) pictureId: string,
  ) {
    return this.escort.deletePicture(req.user.userId, pictureId);
  }

  @Patch('pictures/profile')
  setProfilePicture(@Req() req: any, @Body() dto: SetProfilePictureDto) {
    return this.escort.setProfilePicture(req.user.userId, dto.pictureId);
  }
}
