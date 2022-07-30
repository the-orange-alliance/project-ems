import express, { Application, json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { urlencoded } from 'body-parser';
import passport from 'passport';
import { jwtStrategy, localStrategy, requireAuth } from '@toa/lib-ems';
import authController from './controllers/Authentication';
import errorHandler from './middleware/ErrorHandler';

const app: Application = express();
const server = createServer(app);

app.use(cors({ credentials: true }));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(passport.initialize());

passport.use(jwtStrategy('changeit'));
passport.use(localStrategy());

app.use('/auth', authController);

app.get('/', requireAuth, (req, res) => {
  res.send(req.headers);
});

app.use(errorHandler);

passport.serializeUser((user, cb) => {
  console.log('serialize user', user);
  cb(null, (user as any).id);
});

passport.deserializeUser((id, cb) => {
  console.log('deserialize user', id);
  cb(null, { id: 0, user: 'admin' });
});

server.listen(3001, () => console.log('server started'));
