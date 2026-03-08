import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

@Injectable()
export class EscortImageService {
  private readonly projectRoot = process.cwd();
  // Use scrapper/images (sibling to escort-backend) for scraped escort pictures
  private readonly imagesDir = path.resolve(this.projectRoot, '..', 'scrapper', 'images');

  getImageStream(rawPath: string) {
    if (!rawPath || typeof rawPath !== 'string') {
      throw new BadRequestException('Image path is required');
    }

    const normalizedPath = this.normalizeIncomingPath(rawPath);
    if (!normalizedPath) {
      throw new BadRequestException('Image path is required');
    }

    const absolutePath = path.resolve(this.imagesDir, normalizedPath);

    if (!this.isInsideImagesDir(absolutePath)) {
      throw new BadRequestException('Invalid image path');
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Image not found');
    }

    const stat = statSync(absolutePath);

    if (!stat.isFile()) {
      throw new NotFoundException('Image not found');
    }

    const contentType = mime.lookup(absolutePath) || 'application/octet-stream';
    const stream = createReadStream(absolutePath);

    return {
      stream,
      contentType,
      contentLength: stat.size,
      fileName: path.basename(absolutePath),
      absolutePath,
    };
  }

  private normalizeIncomingPath(rawPath: string): string {
    let normalized = rawPath.replace(/\\/g, '/').trim();
    normalized = normalized.replace(/^\/+/, '');

    if (normalized.startsWith('images/')) {
      normalized = normalized.slice('images/'.length);
    }

    return normalized;
  }

  private isInsideImagesDir(targetPath: string): boolean {
    const relative = path.relative(this.imagesDir, targetPath);

    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }
}
