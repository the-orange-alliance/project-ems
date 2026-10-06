import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import { ZipArchive } from 'archiver';
import extract from 'extract-zip';
import { pipeline } from 'stream/promises';
import { getAppData } from '@toa-lib/server';

async function syncController(fastify: FastifyInstance) {
  // 1. Export Endpoint (Download %APPDATA%/ems as zip)
  fastify.get(
    '/export',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const emsDir = getAppData();

      if (!fs.existsSync(emsDir)) {
        return reply
          .status(404)
          .send({ error: `Directory not found: ${emsDir}` });
      }

      const archive = new ZipArchive({ zlib: { level: 9 } });

      // Set download headers
      reply
        .header('Content-Type', 'application/zip')
        .header(
          'Content-Disposition',
          'attachment; filename="ems-appdata-backup.zip"'
        );

      // In Fastify, sending the archiver instance directly streams it out
      archive.directory(emsDir, false);
      archive.finalize();

      return reply.send(archive);
    }
  );

  // 2. Import Endpoint (Upload zip & extract to %APPDATA%/ems)
  fastify.post(
    '/import',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Process uploaded file stream via @fastify/multipart
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No zip file uploaded' });
      }

      const tempZipPath = path.join(__dirname, `../../temp-${Date.now()}.zip`);
      const targetDir = getAppData();

      try {
        // Stream the uploaded file to disk temporarily
        await pipeline(data.file, fs.createWriteStream(tempZipPath));

        // 1. TODO: Destroy active DB connection pool if running
        // await dbConnection.destroy();

        // 2. Clear current APPDATA/ems directory
        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
        fs.mkdirSync(targetDir, { recursive: true });

        // 3. Extract the uploaded archive into APPDATA/ems
        await extract(tempZipPath, { dir: targetDir });

        // 4. Remove temp file
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }

        // 5. TODO: Re-initialize DB connection pool
        // await dbConnection.initialize();

        return reply.status(200).send({
          success: true,
          message: 'EMS AppData restored successfully.'
        });
      } catch (error: any) {
        request.log.error(error, 'Import failed');

        // Cleanup on failure
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }

        return reply
          .status(500)
          .send({ error: `Import failed: ${error.message}` });
      }
    }
  );
}

export default syncController;
