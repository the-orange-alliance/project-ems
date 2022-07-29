import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';

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
    if (password === 'admin') {
      return done(null, { id: 0, username });
    } else {
      return done(null, false);
    }
  });

export const requireAuth = passport.authenticate('jwt', { session: false });
