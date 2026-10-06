import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PassThrough } from 'stream';
import extract from 'extract-zip';
import { getAppData } from '@toa-lib/server';
import { closeDB, getDB, initGlobal } from '../db/EventDatabase.js';
import logger from '../util/Logger.js';
import { ZipArchive } from 'archiver';

/**
 * Copies a single file safely on Windows, with fallback renaming and atomic stream overwrites for locked handles.
 */
function copyFileSafely(srcPath: string, destPath: string) {
  try {
    fs.copyFileSync(srcPath, destPath);
  } catch (err: any) {
    if (
      err.code === 'EBUSY' ||
      err.code === 'EPIPE' ||
      err.code === 'EPERM' ||
      err.message?.includes('used by another process') ||
      err.message?.includes('user-mapped section')
    ) {
      const tempOldPath = `${destPath}.old-${Date.now()}`;
      try {
        // 1. Move the locked destination file out of the way
        if (fs.existsSync(destPath)) {
          fs.renameSync(destPath, tempOldPath);
        }

        // 2. Write the fresh file cleanly to destPath
        fs.copyFileSync(srcPath, destPath);

        // 3. Attempt removing the renamed locked file
        try {
          fs.unlinkSync(tempOldPath);
        } catch (_) {
          // If Windows still holds the old handle, OS will auto-clean it later
        }
      } catch (renameErr) {
        // 4. Fallback: Force overwrite via low-level write stream
        try {
          const content = fs.readFileSync(srcPath);
          const fd = fs.openSync(destPath, 'w');
          fs.writeSync(fd, content, 0, content.length, 0);
          fs.closeSync(fd);
        } catch (writeErr) {
          logger.error(
            `Failed to replace locked file ${path.basename(destPath)}: ${writeErr}`
          );
        }
      }
    } else {
      throw err;
    }
  }
}

/**
 * Recursively copies files while handling Windows SQLite file locks.
 */
function copyDirectoryContentsSync(srcDir: string, destDir: string) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    // Skip SQLite shared memory and WAL journal files
    if (entry.name.endsWith('.db-shm') || entry.name.endsWith('.db-wal')) {
      continue;
    }

    if (entry.isDirectory()) {
      if (entry.name === 'ems' && srcDir === path.dirname(srcPath)) {
        copyDirectoryContentsSync(srcPath, destDir);
      } else {
        copyDirectoryContentsSync(srcPath, destPath);
      }
    } else {
      copyFileSafely(srcPath, destPath);
    }
  }
}

async function syncController(fastify: FastifyInstance) {
  // Register Content Type Parser
  fastify.addContentTypeParser(
    ['application/octet-stream', 'application/zip'],
    { parseAs: 'buffer', bodyLimit: 100 * 1024 * 1024 },
    (_, payload, done) => {
      done(null, payload);
    }
  );

  // Export Endpoint
  fastify.get(
    '/export',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const emsDir = path.resolve(getAppData('ems'));

      if (!fs.existsSync(emsDir)) {
        return reply
          .status(404)
          .send({ error: `Directory not found: ${emsDir}` });
      }

      const passthrough = new PassThrough();
      const archive = new ZipArchive({ zlib: { level: 9 } });

      archive.on('error', (err: any) => {
        logger.error(err, 'Archiving error');
        if (!reply.raw.headersSent) {
          reply.status(500).send({ error: err.message });
        }
        passthrough.destroy(err);
      });

      reply
        .header('Content-Type', 'application/zip')
        .header(
          'Content-Disposition',
          'attachment; filename="ems-appdata-backup.zip"'
        );

      archive.pipe(passthrough);
      archive.directory(emsDir, false);

      const replyPromise = reply.send(passthrough);
      archive.finalize();

      return replyPromise;
    }
  );

  // Import Endpoint
  fastify.post(
    '/import',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const zipBuffer = request.body as Buffer;

      if (!zipBuffer || zipBuffer.length === 0) {
        return reply.status(400).send({ error: 'No data received' });
      }

      const tempZipPath = path.join(
        os.tmpdir(),
        `ems-import-${Date.now()}.zip`
      );
      const tempExtractDir = path.join(
        os.tmpdir(),
        `ems-extract-${Date.now()}`
      );
      const targetDir = path.resolve(getAppData('ems'));

      try {
        // Step 1: Safely close database handles
        try {
          const global = await getDB('global');

          // Guard against un-initialized global db tables
          let events: any[] = [];
          try {
            events = await global.selectAll('event');
          } catch (_) {
            // 'events' table does not exist yet; safe to skip
          }

          await global.db
            .exec(
              'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;'
            )
            .catch(() => {});
          await closeDB('global');

          for (const event of events) {
            if (event?.id) {
              try {
                const eventDb = await getDB(event.id);
                await eventDb.db
                  .exec(
                    'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;'
                  )
                  .catch(() => {});
                await closeDB(event.id);
              } catch (_) {}
            }
          }
        } catch (dbErr) {
          logger.warn('Warning closing DBs during import: ' + dbErr);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));

        logger.info(`Temp zip file written to: ${tempZipPath}`);
        await fs.promises.writeFile(tempZipPath, zipBuffer);

        logger.info(`Extracting zip to: ${tempExtractDir}`);
        fs.mkdirSync(tempExtractDir, { recursive: true });
        await extract(tempZipPath, { dir: tempExtractDir });

        logger.info(`Copying contents to target: ${targetDir}`);
        copyDirectoryContentsSync(tempExtractDir, targetDir);

        // Step 2: Cleanup temporary extraction artifacts
        if (fs.existsSync(tempExtractDir)) {
          fs.rmSync(tempExtractDir, { recursive: true, force: true });
        }
        if (fs.existsSync(tempZipPath)) {
          await fs.promises.unlink(tempZipPath);
        }

        // Step 3: Re-initialize global database connection
        await initGlobal();

        return reply.status(200).send({
          success: true,
          message: 'EMS AppData restored successfully!'
        });
      } catch (error: any) {
        logger.error(error, 'Import error');

        if (fs.existsSync(tempExtractDir))
          fs.rmSync(tempExtractDir, { recursive: true, force: true });
        if (fs.existsSync(tempZipPath)) await fs.promises.unlink(tempZipPath);

        return reply
          .status(500)
          .send({ error: `Import failed: ${error.message}` });
      }
    }
  );
}

export default syncController;
