
import { Injectable } from '@nestjs/common';
import { bcryptHelper } from 'mvc-common-toolkit';

import { ChangePasswordAdminDTO, LoginAdminDTO } from '@business/admin/auth/admin.dto';
import { SystemUser } from '@business/admin/admin.entity';
import { AdminService } from '@business/admin/admin.service';

@Injectable()
export class AdminAuthService {
  constructor(
    protected adminService: AdminService,
  ) {}

  public async validateSystemUser(dto: LoginAdminDTO): Promise<SystemUser> {
    const admin = await this.adminService.findOne({ email: dto.email });
    if (!admin) return null;

    const isPasswordMatch = await bcryptHelper.compare(dto.password, admin.password);
    if (!isPasswordMatch) return null;

    return admin;
  }
  public async changePasswordSystemUser(dto: ChangePasswordAdminDTO, systemUser: SystemUser): Promise<boolean> {
    const admin = await this.adminService.findOne({id: systemUser.id})
    if(!admin) return false;
    
    const isPasswordMatch = await bcryptHelper.compare(dto.oldPassword, admin.password);
    if (!isPasswordMatch) return false;

    const hashedPassword = await bcryptHelper.hash(dto.newPassword);
    await this.adminService.updateById(systemUser.id, { password: hashedPassword });

    return true;
  }
}
