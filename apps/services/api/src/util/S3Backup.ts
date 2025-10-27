import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { debounce } from 'lodash';

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
  }
};

const bucket = process.env.BACKUP_BUCKET_NAME ?? 'ems-sqlite-backups';

/**
 * Upload the SQLite DB file to S3
 */
async function uploadDatabase(dbPath: string) {
  const fileBuffer = await fs.readFile(dbPath);

  const key = `backups/${path.basename(dbPath)}-${Date.now()}.sqlite`;

  await s3?.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'application/x-sqlite3'
    })
  );

  console.log(`[Backup] Uploaded database to s3://${bucket}/${key}`);
}

/**
 * Debounced version – runs once every 10 minutes (after last call)
 */
export const debouncedUploadDatabase = debounce(
  (dbPath: string) => uploadDatabase(dbPath),
  1 * 60 * 1000, // 1 minutes debounce
  { trailing: true, leading: false }
);
