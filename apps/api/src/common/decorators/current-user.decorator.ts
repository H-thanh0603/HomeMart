import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator((data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.user?.[data] : request.user;
});
