import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FilterLocationDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  deleted?: string;
}
