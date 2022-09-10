import express, { Application, json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { urlencoded } from 'body-parser';
import passport from 'passport';
import {
  jwtStrategy,
  localStrategy,
  requireAuth,
  environment as env
} from '@toa-lib/server';
import adminController from './controllers/Admin';
import authController from './controllers/Authentication';
import eventController from './controllers/Event';
import teamController from './controllers/Team';
import storageController from './controllers/Storage';
import { handleCatchAll, handleErrors } from './middleware/ErrorHandler';
import logger from './util/Logger';
import { initDatabase } from './db/Database';

// Setup our environment
env.loadAndSetDefaults();

// App setup - if any of these fail the server should exit.
try {
  initDatabase();
} catch (e) {
  logger.error(e);
  process.exit(1);
}

// Bind express to our http server
const app: Application = express();
const server = createServer(app);

// Setup and config express middleware
app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(passport.initialize());

// Setup passport config
passport.use(jwtStrategy(env.get().jwtSecret));
passport.use(localStrategy());

// Define our route controllers
app.use('/admin', adminController);
app.use('/auth', authController);
app.use('/event', eventController);
app.use('/teams', teamController);
app.use('/storage', storageController);

// Define root/testing paths
app.get('/', requireAuth, (req, res) => {
  res.send(req.headers);
});

// Define error middleware
app.use(handleErrors);
app.use(handleCatchAll);

// Passport serizliation
passport.serializeUser((user, cb) => {
  console.log('serialize user', user);
  cb(null, (user as any).id);
});

passport.deserializeUser((id, cb) => {
  console.log('deserialize user', id);
  cb(null, { id: 0, user: 'admin' });
});

// Start the server
server.listen(
  {
    host: env.get().serviceHost,
    port: env.get().servicePort
  },
  () =>
    logger.info(
      `[${env.get().nodeEnv.charAt(0).toUpperCase()}][${env
        .get()
        .serviceName.toUpperCase()}] Server started on ${
        env.get().serviceHost
      }:${env.get().servicePort}`
    )
);
