import { ConfigService } from '@nestjs/config';

import { ENV_KEY } from '@shared/constants';

const config = new ConfigService();

export const generateEmail = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
  let email = '';
  for (let i = 0; i < 10; i++) {
    email += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${email}@${config.getOrThrow(ENV_KEY.DOMAIN)}`;
};

export const randomUserName = (userName: string) => {
  return `${userName}_u_${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')}`;
};
