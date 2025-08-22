import { environment as env } from '@toa-lib/server';
import {
  User,
  UserLoginResponse,
  DEFAULT_ADMIN_USERNAME,
  userLoginZod
} from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  AuthenticationInvalidError,
  AuthenticationNotLocalError,
  errorableSchema,
  InternalServerError
} from '../util/Errors.js';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { EventKeyParams, EmptySchema } from '../util/GlobalSchema.js';

const UserArraySchema = z.array(z.any());

async function authenticationController(fastify: FastifyInstance) {
  // GET: current authentication status
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    { schema: { querystring: z.object({ token: z.string() }), response: errorableSchema(z.any()), tags: ['Admin'] } },
    async (request, reply) => {
      jwt.verify(request.query.token, 'changeit', (err, decoded) => {
        if (err) reply.send(AuthenticationError);
        else reply.send(decoded);
      });
    }
  );

  // POST: login
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/login',
    { schema: { body: userLoginZod, response: errorableSchema(z.any()), tags: ['Admin'] } },
    async (request, reply) => {
      return new Promise((resolve) => {
        passport.authenticate(
          'local',
          { session: false },
          (err: any, user: User, info: any) => {
            if (err || !user) {
              reply.send(AuthenticationInvalidError);
              return resolve(null);
            } else {
              // Do one final check - if they're using the admin user, validate they're local.
              if (user.username === DEFAULT_ADMIN_USERNAME) {
                // request.logIn(user, { session: false }, (err) => {
                //   if (err) {
                //     reply.code(500).send(InternalServerError(err));
                //     return resolve(null);
                //   }
                  const userLogin: UserLoginResponse = { ...user, token: '' };
                  userLogin.token = jwt.sign(user, env.get().jwtSecret);
                  reply.send(userLogin);
                  return resolve(null);
                // });
              } else {
                reply.send(AuthenticationNotLocalError);
                return resolve(null);
              }
            }
          }
        )(request.raw, reply.raw, () => {});
      });
    }
  );

  // GET: logout
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/logout',
    { schema: { response: errorableSchema(z.object({ message: z.string() })), tags: ['Admin'] } },
    async (request, reply) => {
      // request.logout({}, () => {
        reply.send({ message: 'successfully logged out' });
      // });
    }
  );

  // GET: users for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/users/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(UserArraySchema), tags: ['Admin'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAll('users');
        reply.send(data);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // GET: setup users for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/setup/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(EmptySchema), tags: ['Admin'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.setupUsers();
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default authenticationController;
