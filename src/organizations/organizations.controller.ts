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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { FilterOrganizationDto } from './dto/filter-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return await this.organizationsService.create(createOrganizationDto);
  }
  @Get()
  findAll(@Query() filterOrganizationDto: FilterOrganizationDto) {
    const deleted = filterOrganizationDto.deleted === 'true';
    return this.organizationsService.findAll(filterOrganizationDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('deleted') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.organizationsService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return await this.organizationsService.update(+id, updateOrganizationDto);
  }

  @Delete('remove/:id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.organizationsService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.organizationsService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createOrganizationDto: CreateOrganizationDto[]) {
    return await this.organizationsService.bulkCreate(createOrganizationDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.organizationsService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.organizationsService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.organizationsService.bulkDelete(body.ids);
  }
}
