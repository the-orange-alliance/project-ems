import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { EventKeyParams } from '../util/GlobalSchema.js';

async function seasonSpecificController(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/fgc25/ecosystem-metrics/:eventKey',

    {
      schema: {
        params: EventKeyParams,
        response: errorableSchema(z.object({
          totalEcosystemBlue: z.number(),
          totalEcosystemCenter: z.number(),
          totalEcosystemRed: z.number(),
          totalUnitsScored: z.number(),
          ecosystemBluePercentage: z.string(),
          ecosystemCenterPercentage: z.string(),
          ecosystemRedPercentage: z.string(),
        })),
        tags: ['Season Specific'],
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const metrics = await db.db.all<{
          totalEcosystemBlue: number;
          totalEcosystemCenter: number;
          totalEcosystemRed: number;
        }>(`
          SELECT
            SUM(COALESCE(biodiversityUnitsBlueSideEcosystem, 0)) AS totalEcosystemBlue,
            SUM(COALESCE(biodiversityUnitsCenterEcosystem, 0)) AS totalEcosystemCenter,
            SUM(COALESCE(biodiversityUnitsRedSideEcosystem, 0)) AS totalEcosystemRed
          FROM match_detail
        `);

        const totalUnitsScored = (metrics[0].totalEcosystemBlue || 0) + (metrics[0].totalEcosystemCenter || 0) + (metrics[0].totalEcosystemRed || 0);

        reply.send({
          totalEcosystemBlue: metrics[0].totalEcosystemBlue || 0,
          totalEcosystemCenter: metrics[0].totalEcosystemCenter || 0,
          totalEcosystemRed: metrics[0].totalEcosystemRed || 0,
          totalUnitsScored,
          ecosystemBluePercentage: totalUnitsScored > 0 ? ((metrics[0].totalEcosystemBlue / totalUnitsScored) * 100).toFixed(2) : 0,
          ecosystemCenterPercentage: totalUnitsScored > 0 ? ((metrics[0].totalEcosystemCenter / totalUnitsScored) * 100).toFixed(2) : 0,
          ecosystemRedPercentage: totalUnitsScored > 0 ? ((metrics[0].totalEcosystemRed / totalUnitsScored) * 100).toFixed(2) : 0,
        });
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default seasonSpecificController;
