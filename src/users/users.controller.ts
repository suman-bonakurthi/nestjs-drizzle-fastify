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
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }
  @Get()
  findAll(@Query() filterUserDto: FilterUserDto) {
    const deleted = filterUserDto.deleted === 'true';
    return this.usersService.findAll(filterUserDto, deleted);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('delete') remove?: string, // optional query param
  ) {
    const deleted = remove === 'true';
    return this.usersService.findOne(id, deleted);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post('create')
  async bulkCreate(@Body() createUserDto: CreateUserDto[]) {
    return await this.usersService.bulkCreate(createUserDto);
  }

  @Delete('remove')
  bulkRemove(@Body() body: { ids: string[] }) {
    return this.usersService.bulkRemove(body.ids);
  }

  @Patch('restore')
  bulkRestore(@Body() body: { ids: string[] }) {
    return this.usersService.bulkRestore(body.ids);
  }

  @Delete('delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.usersService.bulkDelete(body.ids);
  }
}
