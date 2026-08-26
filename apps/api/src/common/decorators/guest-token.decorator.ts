import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Guest cart identity header (uuid issued by frontend for anonymous users). */
export const GuestToken = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-guest-token'] as string) || undefined;
});
