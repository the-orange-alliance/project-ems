import { Response, Request, Router, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { requireParams } from '../middleware/QueryParams';
import {
  AuthenticationError,
  AuthenticationInvalidError
} from '../util/Errors';

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
  requireParams(['username', 'password']),
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err || !user) next(AuthenticationInvalidError);
      req.login(user, { session: false }, (err) => {
        if (err) {
          res.send(err);
        }
        const token = jwt.sign(user, 'changeit');
        return res.json({ user, token });
      });
    })(req, res);
  }
);

router.post('/logout', async (req: Request, res: Response) => {
  req.logout({}, () => {
    res.send('logged out');
  });
});

export default router;
