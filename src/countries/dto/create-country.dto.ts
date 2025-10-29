import { Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateCountryDto {
  @IsNumber()
  readonly currencyId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(3, 20)
  readonly name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  readonly iso: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(3, 20)
  readonly flag: string;

}
