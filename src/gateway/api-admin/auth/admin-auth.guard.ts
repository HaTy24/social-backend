import { Request } from 'express';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AdminService } from '@business/admin/admin.service';
import { ENTITY_STATUS, SYSTEM_USER_TYPE } from '@shared/constants';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const { id } = payload;
      const admin = await this.adminService.getOneByKey(`${id}`);
      if (
        !admin ||
        admin.user_type !== SYSTEM_USER_TYPE.ADMIN ||
        admin.status !== ENTITY_STATUS.ACTIVE
      )
        throw new UnauthorizedException();
      request['activeAdmin'] = admin;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
