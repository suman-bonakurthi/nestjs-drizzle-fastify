import { Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';

export class CreateLanguageDto {
  @IsNumber()
  readonly countryId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(2, 20)
  readonly name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @Length(2, 3)
  readonly code: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(2, 20)
  readonly native: string;
}
