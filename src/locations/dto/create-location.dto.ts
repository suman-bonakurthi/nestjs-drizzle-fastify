import { Trim } from 'class-sanitizer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';

export class CreateLocationDto {
  @IsNumber()
  readonly cityId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(5, 35)
  readonly address: string;

  @IsString()
  @Length(5, 20)
  @IsNotEmpty()
  @Trim()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(2, 12)
  readonly postalCode: string;

  @IsBoolean()
  readonly isPrimary: boolean = false;
}
