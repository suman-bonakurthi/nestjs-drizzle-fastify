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
import { CreateLocationDto } from './dto/create-location.dto';
import { FilterLocationDto } from './dto/filter-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  async create(@Body() createLocationDto: CreateLocationDto) {
    return await this.locationsService.create(createLocationDto);
  }
  @Get()
  findAll(@Query() filterLocationDto: FilterLocationDto) {
    const deleted = filterLocationDto.deleted === 'true';
    return this.locationsService.findAll(filterLocationDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.locationsService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return await this.locationsService.update(+id, updateLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.locationsService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.locationsService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createLocationDto: CreateLocationDto[]) {
    return await this.locationsService.bulkCreate(createLocationDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.locationsService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.locationsService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.locationsService.bulkDelete(body.ids);
  }
}
