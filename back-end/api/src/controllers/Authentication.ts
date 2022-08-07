import { environment as env } from '@toa-lib/server';
import {
  isUserLogin,
  User,
  DEFAULT_ADMIN_USERNAME,
  isUser
} from '@toa-lib/models';
import { Response, Request, Router, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  AuthenticationInvalidError,
  AuthenticationNotLocalError
} from '../util/Errors';
import { requireParams } from '../middleware/QueryParams';
import { validateBody } from '../middleware/BodyValidator';
import isLocal from '../util/Network';

const router = Router();

/** GET method that will return the current authentication status of the user. */
router.get(
  '/',
  requireParams(['token']),
  async (req: Request, res: Response, next: NextFunction) => {
    jwt.verify(<string>req.query.token, 'changeit', (err, decoded) => {
      if (err) next(AuthenticationError);
      res.send(decoded);
    });
  }
);

/** POST method that will attempt to login the user based on their credentials. */
router.post(
  '/login',
  validateBody(isUserLogin),
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'local',
      { session: false },
      (err, user: User, info) => {
        if (err || !user) {
          next(AuthenticationInvalidError);
        } else {
          // Do one final check - if they're using the admin user, validate they're local.
          if (
            user.username === DEFAULT_ADMIN_USERNAME &&
            isLocal(req.socket.remoteAddress || '')
          ) {
            req.login(user, { session: false }, (err) => {
              if (err) {
                res.send(err);
              }
              user.token = jwt.sign(user, env.get().jwtSecret);
              return res.json(user);
            });
          } else {
            next(AuthenticationNotLocalError);
          }
        }
      }
    )(req, res, next);
  }
);

router.post('/logout', async (req: Request, res: Response) => {
  req.logout({}, () => {
    res.send('logged out');
  });
});

export default router;
