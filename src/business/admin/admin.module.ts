import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminService } from "./admin.service";
import { SystemUser } from "./admin.entity";
import { AdminAuthService } from "@business/admin/auth/auth.service";

@Module({
  imports: [TypeOrmModule.forFeature([SystemUser])],
  providers: [AdminService, AdminAuthService, JwtService],
  exports: [AdminService, AdminAuthService]
})

export class AdminModule {}
