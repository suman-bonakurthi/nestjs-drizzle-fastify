import { Trim } from 'class-sanitizer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
export class CreateUserDto {
  @IsString()
  @Trim()
  @IsNotEmpty()
  @Length(4, 20)
  readonly userName: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @Length(8, 30)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,30}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  readonly password: string;
}
