import { Trim } from 'class-sanitizer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
export class CreateCurrencyDto {
  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(5, 20)
  readonly name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  readonly code: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(10, 15)
  readonly symbol: string;
}
