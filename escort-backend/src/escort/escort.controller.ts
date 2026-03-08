import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { EscortService } from './escort.service';
import { GetAllEscortsDto } from './dtos/get-all-escorts.dto';
import { EscortImageService } from './escortImage.service';

@Controller('escort')
export class EscortController {
  constructor(
    private readonly escortService: EscortService,
    private readonly escortImageService: EscortImageService,
  ) {}

  @Get('all')
  getAllEscorts(@Query() query: GetAllEscortsDto) {
    return this.escortService.getAllEscorts(query);
  }

  @Get('top-viewed')
  getTopViewedEscorts() {
    return this.escortService.getTopViewedEscorts();
  }

  @Get('vips')
  getVipEscorts() {
    return this.escortService.getVipEscorts();
  }

  @Get('image/*path')
  getEscortImage(
    @Param('path') rawPath: string | string[],
    @Res() res: Response,
  ) {
    const normalizedRawPath = Array.isArray(rawPath)
      ? rawPath.join('/')
      : rawPath;

    const file = this.escortImageService.getImageStream(normalizedRawPath);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', String(file.contentLength));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    file.stream.pipe(res);
  }

  @Get(':id')
  getEscortById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.escortService.getEscortById(id);
  }
}