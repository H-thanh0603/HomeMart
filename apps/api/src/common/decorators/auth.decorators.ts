import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/generated/prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const OPTIONAL_AUTH_KEY = 'optionalAuth';
/** Route vẫn vào được khi không có/không hợp lệ token; nếu có token hợp lệ thì gắn request.user. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);

export { CurrentUser } from './current-user.decorator';
export type { RequestUser } from '../guards/jwt-auth.guard';
