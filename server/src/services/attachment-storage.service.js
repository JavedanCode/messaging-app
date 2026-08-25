import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';

import { r2BucketName, r2Client } from '../config/r2.js';

export async function uploadAttachment(file) {
  const extension = getFileExtension(file.originalname);
  const key = `attachments/${crypto.randomUUID()}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    }),
  );

  return {
    key,
    contentType: file.mimetype,
    size: file.size,
    originalName: file.originalname,
  };
}

export async function deleteAttachment(key) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: key,
    }),
  );
}

function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');

  if (lastDot === -1) {
    return '';
  }

  return filename.slice(lastDot).toLowerCase();
}

export async function getAttachmentUrl(key, filename = 'attachment') {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    {
      expiresIn: 300,
    },
  );
}
