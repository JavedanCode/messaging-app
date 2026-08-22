import multer from 'multer';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const allowedMimeTypes = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',

  // Documents
  'application/pdf',
  'text/plain',

  // Microsoft Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, callback) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
  }

  return callback(null, true);
}

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single('file');

export { MAX_FILE_SIZE };
