import { ApiProperty } from "@nestjs/swagger";
import { EMAIL_TYPE } from "@shared/constants";
import { IsNotEmpty, MinLength, MaxLength, IsString, IsOptional, IsIn, IsUrl, IsAlphanumeric } from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @MaxLength(255)
  @MinLength(3)
  email: string;

  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @MaxLength(255)
  @MinLength(3)
  @IsOptional()
  originalEmail: string;

  @MaxLength(1000)
  @IsAlphanumeric()
  @IsOptional()
  signature: string;

  @ApiProperty({
    example: '123abcDef!@#',
    description: 'password',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(60)
  password: string;

  @ApiProperty({
    example: 'John Doe',
  })
  @IsNotEmpty()
  @MaxLength(60)
  @IsString()
  fullName: string;

  @ApiProperty({
    example: 'johndoe123',
  })
  @IsNotEmpty()
  @MaxLength(60)
  @IsString()
  userName: string;

  @ApiProperty({
    example: 'url',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website: string;

  @ApiProperty({
    example: 'abcxyz',
  })
  @IsOptional()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    example: 'abcxyz',
  })
  @IsOptional()
  @IsString()
  metadata: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @MinLength(3)
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: '123abcDef!@#',
    description: 'password',
  })
  @IsNotEmpty()
  @MaxLength(60)
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'abc',
  })
  @MinLength(8)
  @MaxLength(255)
  token: string;
}

export class ResendEmailDto {
  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @MinLength(3)
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: EMAIL_TYPE.VERIFY_EMAIL })
  @IsIn(Object.values(EMAIL_TYPE))
  type: EMAIL_TYPE;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @MinLength(3)
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJ0b2tlbiI6IjEyMzQ1NiIsICJleHAiOjE2Nzk2Mzg0OTE3NDN9Cg==',
    description: 'token from url',
  })
  @MinLength(8)
  @MaxLength(255)
  token: string;

  @ApiProperty({
    example: '123abcDef!@#',
    description: 'password',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(60)
  password: string;
}