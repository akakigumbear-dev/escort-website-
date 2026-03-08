import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { Options } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

function imageFileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    return callback(
      new BadRequestException('Only image files are allowed'),
      false,
    );
  }

  callback(null, true);
}

export const escortPicturesMulterOptions: Options = {
  storage: diskStorage({
    destination: './uploads/escort-pictures',
    filename: (req, file, callback) => {
      const fileExt = extname(file.originalname);
      const fileName = `${randomUUID()}${fileExt}`;
      callback(null, fileName);
    },
  }),
  fileFilter: imageFileFilter,
  limits: {
    files: 20,
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
