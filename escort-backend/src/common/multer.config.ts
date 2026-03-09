import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { Options } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

function imageOrVideoFileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const ok =
    file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
  if (!ok) {
    return callback(
      new BadRequestException('Only image and video files are allowed'),
      false,
    );
  }
  callback(null, true);
}

export const escortPicturesMulterOptions: Options = {
  storage: diskStorage({
    destination: './uploads/_tmp',
    filename: (req, file, callback) => {
      const fileExt =
        extname(file.originalname) ||
        (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
      const fileName = `${randomUUID()}${fileExt}`;
      callback(null, fileName);
    },
  }),
  fileFilter: imageOrVideoFileFilter,
  limits: {
    files: 20,
    fileSize: 50 * 1024 * 1024, // 50MB for videos
  },
};

function anyFileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const allowed = /^image\/|^video\/|^application\/pdf$/;
  if (!allowed.test(file.mimetype)) {
    return callback(
      new BadRequestException('Images, videos, and PDFs only'),
      false,
    );
  }
  callback(null, true);
}

export const dmAttachmentMulterOptions: Options = {
  storage: diskStorage({
    destination: './uploads/dm',
    filename: (req, file, callback) => {
      const fileExt = extname(file.originalname) || '';
      const fileName = `${randomUUID()}${fileExt}`;
      callback(null, fileName);
    },
  }),
  fileFilter: anyFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
};
