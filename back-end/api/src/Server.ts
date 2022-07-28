import express, { Application, json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { urlencoded } from 'body-parser';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';

const app: Application = express();
const server = createServer(app);

app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(passport.initialize());

passport.use(
  new LocalStrategy((username, password, done) => {
    if (password === 'admin') {
      console.log('admin user detected');
      return done(null, { id: 0, username });
    } else {
      return done(null, false);
    }
  })
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'changeit'
    },
    (jwtPayload, cb) => {
      console.log('payload', jwtPayload);
      return cb(null, { id: 0, username: 'admin' });
    }
  )
);

app.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res, next) => {
    res.send(req.headers);
  }
);

app.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(400).json({
        message: 'Invalid credentials',
        user: user
      });
    }
    req.login(user, { session: false }, (err) => {
      if (err) {
        res.send(err);
      }
      const token = jwt.sign(user, 'changeit');
      return res.json({ user, token });
    });
  })(req, res);
});

app.post('/logout', (req, res) => {
  req.logout({}, () => console.log('successfully logged out'));
  res.send('logged out');
});

passport.serializeUser((user, cb) => {
  console.log('serialize user', user);
  cb(null, (user as any).id);
});

passport.deserializeUser((id, cb) => {
  console.log('deserialize user', id);
  cb(null, { id: 0, user: 'admin' });
});

server.listen(3001, () => console.log('server started'));
