import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../../config/env';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimetype: string;
}

/**
 * Allowed image types. SVG is deliberately excluded: it can embed scripts and
 * uploads are served same-origin, so accepting it enables stored XSS.
 */
const ALLOWED_MIME_EXTS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};
const CANONICAL_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Detect the real image type from magic bytes — the client mimetype is untrusted. */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/** Safe storage extension: must match the declared (and sniffed) mimetype. */
function safeExt(mimetype: string, originalname: string): string {
  const clientExt = path.extname(originalname).toLowerCase();
  if (clientExt && ALLOWED_MIME_EXTS[mimetype]?.includes(clientExt)) return clientExt;
  return CANONICAL_EXT[mimetype];
}

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
    const env = getEnv();
    this.driver = env.STORAGE_DRIVER;
    this.uploadDir = env.UPLOAD_DIR;

    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: env.S3_REGION ?? 'auto',
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY ?? '',
          secretAccessKey: env.S3_SECRET_KEY ?? '',
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

    const maxMb = getEnv().MAX_UPLOAD_MB;
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds maximum size of ${maxMb}MB`);
    }

    if (!ALLOWED_MIME_EXTS[file.mimetype]) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF are allowed');
    }

    // Content sniffing: the declared mimetype comes from the client and can be
    // forged. The real bytes must agree, or the upload is rejected.
    const sniffed = sniffImageMime(file.buffer ?? Buffer.alloc(0));
    if (sniffed !== file.mimetype) {
      throw new BadRequestException('File content does not match its declared image type');
    }

    const ext = safeExt(file.mimetype, file.originalname);
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

    if (!ALLOWED_MIME_EXTS[mimetype]) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF are allowed');
    }
    const ext = safeExt(mimetype, filename);
    const key = `${folder}/${randomUUID()}${ext}`;
    const bucket = getEnv().S3_BUCKET ?? '';

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
    const env = getEnv();
    if (this.driver === 's3') {
      if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL}/${key}`;
      return `https://${env.S3_BUCKET ?? ''}.s3.${env.S3_REGION ?? 'auto'}.amazonaws.com/${key}`;
    }
    return `${env.UPLOAD_BASE_URL}/${key}`;
  }

  // ─── Private ───

  private async uploadS3(file: Express.Multer.File, key: string): Promise<UploadResult> {
    const bucket = getEnv().S3_BUCKET ?? '';
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
