import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;
}

export class OAuthLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idToken: string;
}
