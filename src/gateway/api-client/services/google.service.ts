import { OAuth2Client } from 'google-auth-library';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty } from '@nestjs/swagger';

import { HttpResponse } from '@core/dto/response';

export class GoogleLoginDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6ImEwNmFmMGI2OGEyMTE5ZDY5MmNhYzRhYmY0MTVmZjM3ODgxMzZmNjUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI2NjE5NDMwNjQyMTgtamNzdDlrbTY4b3ZzaGNiMzI1YnFhMWltbzIxMW8wYWQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI2NjE5NDMwNjQyMTgtamNzdDlrbTY4b3ZzaGNiMzI1YnFhMWltbzIxMW8wYWQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTEwNjMwNTQzOTY4OTMyODA5MjUiLCJoZCI6ImF1Z21lbnRsYWJzLmlvIiwiZW1haWwiOiJoYWlAYXVnbWVudGxhYnMuaW8iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmJmIjoxNjk4NTI3MzA1LCJuYW1lIjoiSGFpIEhhaSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLeWgtMDc3RW13Tlc2Wi03MHU2VWt0MGtKUHh3MVRsQlBJSS1QOUZLSzM9czk2LWMiLCJnaXZlbl9uYW1lIjoiSGFpIiwiZmFtaWx5X25hbWUiOiJIYWkiLCJsb2NhbGUiOiJlbi1HQiIsImlhdCI6MTY5ODUyNzYwNSwiZXhwIjoxNjk4NTMxMjA1LCJqdGkiOiJlZGFlMTAwMmZkMjVhMmJmZjQ4ZWY2ZDU3NzE1MGJmZGU3YzFlODU1In0.cufPTbGfqDAl8mtguAw0rY5eIOoMAJqoUNFVfQlgYby-pR_88Ju2Y1zyChuIbVN3Ug-If0Q-KT8vXQNhLKSgLKII3UrRu7RMSfv8_FC1EWzYrjmHu7Pk7m43EALsD3pLt9saUzf3po5kSnszgeev_v9dqudf0Pqa1G4aAxAbKLf86qh3tJJGyE8V0l65pzMO_MSiWWPgHk5-EOKKaTr7ey3aND1m0jF7_F-sBS3ADbnQLlDM1-5DppUMM4VFBFyh_1ZvkxytNvKf-SF0uBD2Ul3TGg4E2zSUwgtFKjdx6FKU8sQ8PgTlzpXsVFlbqPqFEMgZYsFOvu_vTLrplYsRW',
  })
  credential: string;
  @ApiProperty({
    example:
      '2f840db725223d7',
  })
  g_csrf_token: string;
}

export interface GoogleUserPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  hd: string;
  email: string;
  email_verified: boolean;
  nbf: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
  jti: string;
}

@Injectable()
export class GoogleService {
  protected logger = new Logger(this.constructor.name);

  private client: OAuth2Client;
  private googleClientId: string;

  constructor(protected configService: ConfigService) {
    this.googleClientId = this.configService.getOrThrow('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client();
  }

  async verify(
    logId: string,
    token: string,
  ): Promise<HttpResponse<GoogleUserPayload>> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });
      const data = ticket.getPayload() as GoogleUserPayload;
      return { success: true, data };
    } catch (e) {
      this.logger.error(`[${logId}]: ${e}`);
    }
    return { success: false };
  }
}
