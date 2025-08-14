import { Team, WPAKey, isFMSSettings } from '@toa-lib/models';
import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { validateBody } from '../middleware/BodyValidator.js';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { EventKeyParams, EmptySchema, SuccessSchema } from '../util/GlobalSchema.js';

const WPAKeyDatabase = 'fms_wpakeys';
const WPAKeyArraySchema = z.array(
  z.object({ teamKey: z.any(), eventKey: z.any(), wpaKey: z.string() })
);

// WPA Key Generator
const wpaKey = () => {
  var key = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 8; i++) {
    key += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return key;
};

async function frcFmsController(fastify: FastifyInstance) {
  // Get all advanced networking configs, unless a specific hardware fingerprint is specified
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/advancedNetworkingConfig',
      {
        schema: {
          querystring: z.object({ hwFingerprint: z.string().optional() }),
          response: errorableSchema(z.array(z.any())),
          tags: ['FrcFms']
        }
      },
      async (request, reply) => {
        const db = await getDB('global');
        const hwFingerprint = request.query.hwFingerprint;
        let data;
        try {
          if (typeof hwFingerprint === 'string' && hwFingerprint.length > 0) {
            data = await db.selectAllWhere(
              'fms_adv_net_cfg',
              `hwFingerprint="${hwFingerprint}"`
            );
          } else {
            data = await db.selectAll('fms_adv_net_cfg');
          }
          reply.send(data);
        } catch (e) {
          reply.send([]);
        }
      }
    );

  // Update a specific config based on the hardware fingerprint
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/advancedNetworkingConfig',
      {
        schema: {
          // body: isFMSSettings,
          response: errorableSchema(SuccessSchema),
          tags: ['FrcFms']
        }
      },
      async (request, reply) => {
        const db = await getDB('global');
        const body = request.body as any;
        try {
          await db.insertValue('fms_adv_net_cfg', [body]);
        } catch (e) {
          await db.updateWhere(
            'fms_adv_net_cfg',
            body,
            `hwFingerprint = '${body.hwFingerprint}'`
          );
        }
        reply.send({ success: true });
      }
    );

  // Get all WPA keys for event
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/:eventKey/wpakeys',
      {
        schema: {
          params: EventKeyParams,
          response: errorableSchema(WPAKeyArraySchema),
          tags: ['FrcFms']
        }
      },
      async (request, reply) => {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const keys = await db.selectAllWhere(
          WPAKeyDatabase,
          `eventKey = '${eventKey}'`
        );
        reply.send(keys);
      }
    );

  // Regenerate ALL WPA Keys, returns all WPA Keys
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/:eventKey/wpakeys/generateAll',
      {
        schema: {
          params: EventKeyParams,
          response: errorableSchema(WPAKeyArraySchema),
          tags: ['FrcFms']
        }
      },
      async (request, reply) => {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const teams: Team[] = await db.selectAllWhere(
          'team',
          `eventKey = '${eventKey}'`
        );
        const wpaKeys: WPAKey[] = [];
        for (const team of teams) {
          wpaKeys.push({
            teamKey: team.teamKey,
            eventKey: team.eventKey,
            wpaKey: wpaKey()
          });
        }
        await db.deleteWhere(WPAKeyDatabase, `eventKey = '${eventKey}'`);
        await db.insertValue(WPAKeyDatabase, wpaKeys);
        reply.send(wpaKeys);
      }
    );

  // Generate only missing WPA Keys, returns ALL existing keys, including new ones
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/:eventKey/wpakeys/generateMissing',
      {
        schema: {
          params: EventKeyParams,
          response: errorableSchema(WPAKeyArraySchema),
          tags: ['FrcFms']
        }
      },
      async (request, reply) => {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const teams: Team[] = await db.selectAllWhere(
          'team',
          `eventKey = '${eventKey}'`
        );
        const existing: WPAKey[] = await db.selectAllWhere(
          WPAKeyDatabase,
          `eventKey = '${eventKey}'`
        );
        for (const exists of existing) {
          const existsIndex = teams.findIndex((t) => t.teamKey === exists.teamKey);
          if (existsIndex > -1) {
            teams.splice(existsIndex, 1);
          }
        }
        const newWpaKeys: WPAKey[] = [];
        for (const team of teams) {
          newWpaKeys.push({
            teamKey: team.teamKey,
            eventKey: team.eventKey,
            wpaKey: wpaKey()
          });
        }
        await db.insertValue(WPAKeyDatabase, newWpaKeys);
        const wpaKeys = await db.selectAllWhere(
          WPAKeyDatabase,
          `eventKey = '${eventKey}'`
        );
        reply.send(wpaKeys);
      }
    );
}

export default frcFmsController;
