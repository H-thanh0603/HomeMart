import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadsModule {}
