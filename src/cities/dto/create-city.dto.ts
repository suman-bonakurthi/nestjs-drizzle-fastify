import { Trim } from 'class-sanitizer';
import { IsNotEmpty, IsNumber, IsString, Length } from 'class-validator';

export class CreateCityDto {
  @IsNumber()
  readonly countryId: number;

  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(5, 20)
  readonly name: string;
}
