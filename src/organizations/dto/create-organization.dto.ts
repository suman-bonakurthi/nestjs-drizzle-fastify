import { Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsNumber()
  readonly countryId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(5, 20)
  readonly name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(10, 15)
  readonly phone: string;

  @IsString()
  @IsUrl()
  @IsNotEmpty()
  @Trim()
  readonly url: string;
}
