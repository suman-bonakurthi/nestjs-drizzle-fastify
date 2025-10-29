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
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { FilterCityDto } from './dto/filter-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  async create(@Body() createCityDto: CreateCityDto) {
    return await this.citiesService.create(createCityDto);
  }
  @Get()
  findAll(@Query() filterCityDto: FilterCityDto) {
    const deleted = filterCityDto.deleted === 'true';
    return this.citiesService.findAll(filterCityDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.citiesService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return await this.citiesService.update(+id, updateCityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citiesService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.citiesService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.citiesService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createCityDto: CreateCityDto[]) {
    return await this.citiesService.bulkCreate(createCityDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.citiesService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.citiesService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.citiesService.bulkDelete(body.ids);
  }
}
