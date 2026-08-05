import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { DataNotFoundError, errorableSchema, InternalServerError } from '../util/Errors.js';
import { CardStatus, getCardCarryPhase, teamZod } from '@toa-lib/models';
import { EventKeyParams, EmptySchema, EventTeamKeyParams, EventTournamentKeyParams } from '../util/GlobalSchema.js';

const teamsZod = z.array(teamZod);

const carryCardsZod = z.array(
  z.object({ teamKey: z.number(), cardStatus: z.number() })
);

async function teamController(fastify: FastifyInstance) {
  // NOTE: there is deliberately no `GET /` here. It used to select `team` from
  // the *global* database, which has no such table (teams are per-event), so it
  // returned a 500 on every call. It had no callers. Teams are only meaningful
  // scoped to an event — use `GET /:eventKey`.

  // Get teams by eventKey
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema<typeof teamsZod, typeof DataNotFoundError>(teamsZod, DataNotFoundError), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
        if (!data) {
          reply.code(DataNotFoundError.code).send(DataNotFoundError);
        } else {
          reply.send(data);
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Promote match cards onto the carrying team for the rest of the *phase*.
  //
  // A card carries through qualification, or through playoffs, but never across
  // the boundary between them — see getCardCarryPhase. The phase is derived
  // server-side from the tournament rather than accepted from the caller, so
  // the rule has one definition and clients cannot disagree about it.
  //
  // Clearing rules, which are narrower than they look:
  //  - A card for the *current* phase is never cleared here. A later clean
  //    match, or a replay, must not drop one; that stays a manual act via the
  //    Carried Card control in the team editor.
  //  - A card from a *previous* phase is cleared, because it is already spent.
  //    Read paths scope validity by phase anyway, so this is housekeeping to
  //    keep GET /teams honest rather than something correctness depends on.
  //
  // Only YELLOW_CARD carries. Reds and whites are per-match rulings and are
  // left on the match participant, and a team already carrying a yellow is not
  // escalated to a red by receiving another — that is a human decision, which
  // is what the scorekeeper's "consult with HR" prompt is for.
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/carry-cards/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        body: carryCardsZod,
        response: errorableSchema<typeof EmptySchema>(EmptySchema),
        tags: ['Teams']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        const [tournament] = await db.selectAllWhere(
          'tournament',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        const phase = tournament ? getCardCarryPhase(tournament) : null;

        // Test and practice cards go nowhere. Note this returns *before* the
        // stale-phase cleanup below: a practice tournament run between quals
        // and playoffs must not wipe cards teams are legitimately carrying.
        if (!phase) {
          reply.status(200).send({});
          return;
        }

        // Drop cards left over from a phase that is now finished.
        await db.updateWhere(
          'team',
          { cardStatus: CardStatus.NO_CARD, hasCard: 0, cardPhase: null },
          `eventKey = "${eventKey}" AND cardPhase IS NOT NULL AND cardPhase != "${phase}"`
        );

        for (const { teamKey, cardStatus } of request.body) {
          if (cardStatus !== CardStatus.YELLOW_CARD) continue;
          // Guarding on "no card *for this phase*" keeps this idempotent — a
          // team already carrying one is left exactly as it is.
          await db.updateWhere(
            'team',
            {
              cardStatus: CardStatus.YELLOW_CARD,
              hasCard: 1,
              cardPhase: phase
            },
            `eventKey = "${eventKey}" AND teamKey = ${teamKey} ` +
              `AND (cardPhase IS NULL OR cardPhase != "${phase}" ` +
              `OR cardStatus IS NULL OR cardStatus = ${CardStatus.NO_CARD})`
          );
        }
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Insert teams for event
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/:eventKey',
    { schema: { params: EventKeyParams, body: teamsZod, response: errorableSchema<typeof EmptySchema>(EmptySchema), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.insertValue('team', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update team for event
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:teamKey',
    { schema: { params: EventTeamKeyParams, body: teamZod, response: errorableSchema<typeof EmptySchema>(EmptySchema), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey, teamKey } = request.params as z.infer<typeof EventTeamKeyParams>;
        const db = await getDB(eventKey);
        await db.updateWhere(
          'team',
          request.body,
          `eventKey = "${eventKey}" AND teamKey = "${teamKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete team for event
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:teamKey',
    { schema: { params: EventTeamKeyParams, response: errorableSchema<typeof EmptySchema, typeof DataNotFoundError>(EmptySchema, DataNotFoundError), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey, teamKey } = request.params as z.infer<typeof EventTeamKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.deleteWhere(
          'team',
          `eventKey = "${eventKey}" AND teamKey = ${teamKey}`
        );
        if (!data) {
          reply.code(DataNotFoundError.code).send(DataNotFoundError);
        } else {
          reply.send({});
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default teamController;
