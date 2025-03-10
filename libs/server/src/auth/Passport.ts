import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USER,
  DEFAULT_ADMIN_USERNAME
} from '@toa-lib/models';

/**
 * Library file for using different passport strategies within EMS.
 */
export const jwtStrategy = (secretOrKey: string | Buffer | undefined) =>
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

export const requireAuth = passport.authenticate('jwt', { session: false });
