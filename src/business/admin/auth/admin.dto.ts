import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LoginAdminDTO {
  @ApiProperty({
    example: 'admin@augmentlabs.io',
  })
  email: string;

  @ApiProperty({
    example: 'admin',
  })
  password: string;
}
export class ChangePasswordAdminDTO {
  @IsString()
  @ApiProperty({
    example: 'oldPassword',
  })
  oldPassword: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({
    example: 'newPassword',
  })
  newPassword: string;
}