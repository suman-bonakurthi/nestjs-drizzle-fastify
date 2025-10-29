import { Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';

export class CreateContactDto {
  @IsNumber()
  readonly organizationId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(5, 20)
  readonly fullName: string;

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
  @IsNotEmpty()
  @Trim()
  readonly title: string;
}
