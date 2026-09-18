import { AsyncDatabase } from 'promised-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import type { TestContext } from 'node:test';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import graphicsController from '../controllers/Graphics.js';
import { GraphicsRepository } from '../graphics/GraphicsRepository.js';

/** No getDB/global application cache or real APPDATA is accessed by these tests. */
export async function graphicsFixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'ems-graphics-'));
  const global = await AsyncDatabase.open(join(root, 'global.db'));
  try {
    await global.exec(
      'CREATE TABLE event(eventKey TEXT PRIMARY KEY, seasonKey TEXT)'
    );
    for (const eventKey of ['event-a', 'event-b'])
      await global.run('INSERT INTO event VALUES(?,?)', [eventKey, 'fgc_2026']);
  } finally {
    await global.close();
  }
  for (const eventKey of ['event-a', 'event-b']) {
    const db = await AsyncDatabase.open(join(root, `${eventKey}.db`));
    await db.close();
  }
  const repository = new GraphicsRepository({ databaseRoot: root });
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(graphicsController, { prefix: '/graphics', repository });
  t.after(async () => {
    await app.close();
    if (
      !resolve(root).startsWith(resolve(tmpdir()) + sep) ||
      !basename(root).startsWith('ems-graphics-')
    )
      throw new Error('Unsafe test cleanup path');
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100
    });
  });
  return {
    root,
    repository,
    app,
    async withDatabase<T>(
      eventKey: string,
      work: (db: AsyncDatabase) => Promise<T>
    ) {
      if (!['global', 'event-a', 'event-b'].includes(eventKey))
        throw new Error('Unknown fixture database');
      const db = await AsyncDatabase.open(join(root, `${eventKey}.db`));
      try {
        return await work(db);
      } finally {
        await db.close();
      }
    }
  };
}
export const sampleGraphic = (id = 'spec-1') => ({
  id,
  title: 'Score',
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile' as const,
  mode: 'fullscreen' as const,
  options: {}
});
