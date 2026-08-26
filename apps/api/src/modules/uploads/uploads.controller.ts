import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorators';
import { UploadService } from './upload.service';

const multerConfig = {
  storage: diskStorage({
    destination: './tmp/uploads',
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Upload ảnh (JPEG/PNG/WebP/GIF/SVG, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'products' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Read file from disk (multer saved it there) into buffer, then upload via service
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(file.path);
    const uploadFile: Express.Multer.File = {
      ...file,
      buffer,
    };
    // Cleanup temp file
    await fs.unlink(file.path).catch(() => {});
    return this.uploadService.upload(uploadFile, 'products');
  }
}
