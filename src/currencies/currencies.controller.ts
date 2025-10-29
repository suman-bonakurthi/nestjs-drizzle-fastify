import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { FilterCurrencyDto } from './dto/filter-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  async create(@Body() createCurrencyDto: CreateCurrencyDto) {
    return await this.currenciesService.create(createCurrencyDto);
  }
  @Get()
  findAll(@Query() filterCurrencyDto: FilterCurrencyDto) {
    const deleted = filterCurrencyDto.deleted === 'true';
    return this.currenciesService.findAll(filterCurrencyDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.currenciesService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    return await this.currenciesService.update(+id, updateCurrencyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.currenciesService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.currenciesService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.currenciesService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createCurrencyDto: CreateCurrencyDto[]) {
    return await this.currenciesService.bulkCreate(createCurrencyDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.currenciesService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.currenciesService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.currenciesService.bulkDelete(body.ids);
  }
}
