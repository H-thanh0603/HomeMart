import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimetype: string;
}

/**
 * Unified file upload service — supports 'local' and 's3' storage drivers.
 * When driver is 'local', files are saved to UPLOAD_DIR and served via
 * a static route. When 's3', files are uploaded to the configured bucket
 * and the public URL is returned.
 *
 * Env vars:
 *   STORAGE_DRIVER  — 'local' | 's3' (default: 'local')
 *   UPLOAD_DIR      — local upload directory (default: './uploads')
 *   S3_BUCKET       — S3 bucket name
 *   S3_REGION       — S3 region (default: 'auto')
 *   S3_ENDPOINT     — S3 endpoint URL (for R2, Wasabi, etc.)
 *   S3_ACCESS_KEY   — S3 access key ID
 *   S3_SECRET_KEY   — S3 secret access key
 *   S3_PUBLIC_URL   — public URL prefix (e.g. 'https://cdn.example.com/uploads')
 *   MAX_UPLOAD_MB   — max file size in MB (default: 5)
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly driver: 'local' | 's3';
  private readonly uploadDir: string;
  private s3?: S3Client;

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local';
    this.uploadDir = process.env.UPLOAD_DIR ?? './uploads';

    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        },
      });
      this.logger.log('S3 storage driver initialized');
    } else {
      this.logger.log('Local storage driver initialized');
    }
  }

  /**
   * Upload a file from multer's buffer.
   */
  async upload(file: Express.Multer.File, folder = 'products'): Promise<UploadResult> {
    if (!file) throw new BadRequestException('No file provided');

    const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 5);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds maximum size of ${maxMb}MB`);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF, and SVG are allowed');
    }

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `${folder}/${randomUUID()}${ext}`;

    if (this.driver === 's3') {
      return this.uploadS3(file, key);
    }
    return this.uploadLocal(file, key);
  }

  /**
   * Get a presigned URL for direct browser upload (for large files).
   */
  async getPresignedUrl(filename: string, mimetype: string, folder = 'products'): Promise<{ url: string; key: string }> {
    if (this.driver !== 's3') {
      throw new BadRequestException('Presigned URLs only available with S3 driver');
    }

    const ext = extname(filename).toLowerCase() || '.jpg';
    const key = `${folder}/${randomUUID()}${ext}`;
    const bucket = process.env.S3_BUCKET ?? '';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimetype,
      ACL: 'public-read',
    });

    const url = await getSignedUrl(this.s3!, command, { expiresIn: 300 });
    return { url, key };
  }

  /**
   * Get the full URL for a stored key.
   */
  getUrl(key: string): string {
    if (this.driver === 's3') {
      const publicUrl = process.env.S3_PUBLIC_URL ?? '';
      const bucket = process.env.S3_BUCKET ?? '';
      if (publicUrl) return `${publicUrl}/${key}`;
      return `https://${bucket}.s3.${process.env.S3_REGION ?? 'auto'}.amazonaws.com/${key}`;
    }
    const baseUrl = process.env.UPLOAD_BASE_URL ?? '/uploads';
    return `${baseUrl}/${key}`;
  }

  // ─── Private ───

  private async uploadS3(file: Express.Multer.File, key: string): Promise<UploadResult> {
    const bucket = process.env.S3_BUCKET ?? '';
    if (!bucket) throw new BadRequestException('S3_BUCKET not configured');

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    return {
      url: this.getUrl(key),
      key,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  private async uploadLocal(file: Express.Multer.File, key: string): Promise<UploadResult> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    return {
      url: this.getUrl(key),
      key,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
