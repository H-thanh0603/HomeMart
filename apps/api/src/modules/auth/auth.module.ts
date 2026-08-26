import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { getEnv } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getEnv().JWT_ACCESS_SECRET,
        signOptions: { expiresIn: getEnv().JWT_ACCESS_TTL },
      }),
    }),
    EventEmitterModule.forRoot({ wildcard: true }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
