import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import { sep } from 'path';
import _ from 'lodash';
import logger from './Logger.js';
import { getAppData } from '@toa-lib/server';

let bucket: string | null = null;
let s3: S3Client | null = null;

export const initS3Client = () => {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    bucket = process.env.BACKUP_BUCKET_NAME ?? null;
    logger.info('S3 Backup client initialized');
  }
};

/**
 * Upload the SQLite DB file to S3
 */
async function uploadDatabase(eventKey: string) {
  if (!s3 || !bucket) return;
  const path = getAppData('ems') + sep + eventKey + '.db';
  const fileBuffer = await fs.readFile(path);
  const ts = new Date().toISOString().replace(/[:.]/g, '-'); // e.g. 2025-10-27T20-18-05-123Z
  const key = `backups/${eventKey}-${ts}.sqlite`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'application/x-sqlite3'
    })
  );

  logger.info(`[Backup] Uploaded database to s3://${bucket}/${key}`);
}

/**
 * Debounced version – runs once every 10 minutes (after last call)
 */
export const debouncedUploadDatabase = _.debounce(
  (eventKey: string) => uploadDatabase(eventKey),
  1 * 5 * 1000, // 1 minutes debounce
  { trailing: true, leading: false }
);
