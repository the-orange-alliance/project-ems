import { environment as env } from '@toa-lib/server';
import {
  User,
  UserLoginResponse,
  DEFAULT_ADMIN_USERNAME,
  userLoginZod
} from '@toa-lib/models';
import { Response, Request, Router, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  AuthenticationInvalidError,
  AuthenticationNotLocalError
} from '../util/Errors.js';
import { requireParams } from '../middleware/QueryParams.js';
import { validateBodyZ } from '../middleware/BodyValidator.js';
import { getDB } from '../db/EventDatabase.js';

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
  validateBodyZ(userLoginZod),
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'local',
      { session: false },
      (err: any, user: User, info: any) => {
        if (err || !user) {
          return next(AuthenticationInvalidError);
        } else {
          // Do one final check - if they're using the admin user, validate they're local.
          if (user.username === DEFAULT_ADMIN_USERNAME) {
            req.login(user, { session: false }, (err) => {
              if (err) {
                return next(err);
              }
              const userLogin: UserLoginResponse = { ...user, token: '' };
              userLogin.token = jwt.sign(user, env.get().jwtSecret);
              return res.json(userLogin);
            });
          } else {
            return next(AuthenticationNotLocalError);
          }
        }
      }
    )(req, res, next);
  }
);

router.get('/logout', async (req: Request, res: Response) => {
  req.logout({}, () => {
    res.send({ message: 'successfully logged out' });
  });
});

router.get(
  '/users/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAll('users');
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/setup/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      await db.setupUsers();
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
