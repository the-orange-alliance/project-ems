import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USER,
  DEFAULT_ADMIN_USERNAME
} from '@toa-lib/models';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Library file for using different passport strategies within EMS.
 */
export const jwtStrategy = (secretOrKey: string | Buffer) =>
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey
    },
    (jwtPayload, cb) => {
      return cb(null, jwtPayload);
    }
  );

export const localStrategy = () =>
  new LocalStrategy((username, password, done) => {
    if (
      username === DEFAULT_ADMIN_USERNAME &&
      password === DEFAULT_ADMIN_PASSWORD
    ) {
      return done(null, DEFAULT_ADMIN_USER);
    } else {
      return done(null, false);
    }
  });

export const requireAuth = (
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: unknown) => {
      if (err) {
        return done(err);
      }

      // TODO - We don't actually validate anything, or log the user in. Lol.
      // if (!user) {
      //   reply.code(401).send({ error: 'Unauthorized' });
      //   return;
      // }
      done();
    }
  )(request.raw, reply.raw);
};
