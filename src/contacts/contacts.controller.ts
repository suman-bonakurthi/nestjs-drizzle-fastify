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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    return await this.contactsService.create(createContactDto);
  }
  @Get()
  findAll(@Query() filterContactDto: FilterContactDto) {
    const deleted = filterContactDto.deleted === 'true';
    return this.contactsService.findAll(filterContactDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.contactsService.findOne(+id, deleted);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return await this.contactsService.update(+id, updateContactDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(+id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.contactsService.restore(+id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.contactsService.delete(+id);
  }

  @Post('create')
  async bulkCreate(@Body() createContactDto: CreateContactDto[]) {
    return await this.contactsService.bulkCreate(createContactDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.contactsService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: number[] }) {
    return this.contactsService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.contactsService.bulkDelete(body.ids);
  }
}
