import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { ENTITY_STATUS } from '@shared/constants';

export const RequestSystemUser = createParamDecorator(
  async (isOptional: string, ctx: ExecutionContext) => {
    const isRequired = !isOptional;
    const systemUser = ctx.switchToHttp().getRequest().activeAdmin;
    if (
      isRequired &&
      (!systemUser ||
        systemUser.deletedAt ||
        systemUser.status !== ENTITY_STATUS.ACTIVE)
    )
      throw new Error('Invalid system user');
    return systemUser;
  },
);
