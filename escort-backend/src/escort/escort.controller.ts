import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { EscortService } from './escort.service';
import { GetAllEscortsDto } from './dtos/get-all-escorts.dto';

@Controller('escort')
export class EscortController {
  constructor(private readonly escortService: EscortService) {

  }

    @Get('/all')
  getAllEscorts(@Query() query: GetAllEscortsDto) {
    return this.escortService.getAllEscorts(query);
  }

    @Get(':id')
  getEscortById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.escortService.getEscortById(id);
  }

    @Get('/top-viewed')
  getTopViewedEscorts() {
    return this.escortService.getTopViewedEscorts();
  }

  @Get('/vips')
  getVipEscorts() {
    return this.escortService.getVipEscorts();
  }

}
