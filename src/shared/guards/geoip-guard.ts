import { GetLogId } from "@core/logging/logging";
import { CanActivate, ExecutionContext, Injectable, Logger, SetMetadata } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

export const BlockedCountries = (countries: string[]) => SetMetadata('blocked_countries', countries)

export const AllowedCountries = (countries: string[]) => SetMetadata('allowed_countries', countries)

@Injectable()
export class GeoIpGuard implements CanActivate {
  private logger = new Logger(this.constructor.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) { }

  public canActivate(context: ExecutionContext): boolean {
    const isBypass = this.configService.get('GEO_COUNTRY_CHECK', 'true') === 'false';

    if (isBypass) return true;

    const request: Request = context.switchToHttp().getRequest();
    const logId = GetLogId(request);
    const country = request.header('cf-ipcountry');

    const blockedCountries = this.reflector.get('blocked_countries', context.getHandler());
    if (blockedCountries?.length) {
      const isBlocked = blockedCountries.includes(country);
      if (isBlocked) {
        this.logger.debug(`${logId}: Request is blocked cause of blacklist: ${blockedCountries}`);
        return false;
      }
    }

    const allowedCountries = this.reflector.get('allowed_countries', context.getHandler());
    if (allowedCountries?.length) {
      const isAllowed = allowedCountries.includes(country);
      if (!isAllowed) {
        this.logger.debug(`${logId}: Request is blocked cause of whitelist: ${allowedCountries}`);
        return false;
      }
    }

    return true;
  }
}