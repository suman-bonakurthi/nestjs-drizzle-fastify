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
import { CreateLanguageDto } from './dto/create-language.dto';
import { FilterLanguageDto } from './dto/filter-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguagesService } from './languages.service';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  async create(@Body() createLanguageDto: CreateLanguageDto) {
    return await this.languagesService.create(createLanguageDto);
  }
  @Get()
  findAll(@Query() filterLanguageDto: FilterLanguageDto) {
    const deleted = filterLanguageDto.deleted === 'true';
    return this.languagesService.findAll(filterLanguageDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.languagesService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return await this.languagesService.update(+id, updateLanguageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.languagesService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.languagesService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.languagesService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createLanguageDto: CreateLanguageDto[]) {
    return await this.languagesService.bulkCreate(createLanguageDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.languagesService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.languagesService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.languagesService.bulkDelete(body.ids);
  }
}
