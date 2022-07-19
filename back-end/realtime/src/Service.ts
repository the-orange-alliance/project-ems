import express, { Application, json } from "express";
import { createServer } from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import { urlencoded } from "body-parser";
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';

const app: Application = express();
const server = createServer(app);
const io = new Server(server);

// Config middleware
app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(json());
app.use(urlencoded({ extended: false }));

// Session middleware
app.use(passport.initialize());

passport.use(new LocalStrategy((username, password, done) => {
    if (password === 'admin') {
        console.log('admin user detected');
        return done(null, { id: 0, username });
    } else {
        return done(null, false);
    }
}));

passport.use(new JWTStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: 'changeit' 
    },
    (jwtPayload, cb) => {
        console.log('payload', jwtPayload);
        return cb(null, { id: 0, username: 'admin' });
    }
));

app.get('/', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    res.send(req.headers);
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.status(400).json({
                message: 'Invalid credentials',
                user   : user
            });
        }
       req.login(user, { session: false }, (err) => {
           if (err) {
               res.send(err);
           }
           const token = jwt.sign(user, 'changeit');
           return res.json({user, token});
        });
    })(req, res);
});

  app.post("/logout", (req, res) => {
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


io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.token) {
        jwt.verify(socket.handshake.query.token.toString(), 'changeit', (err, decoded) => {
            if (err) {
                return next(new Error('Authentication Error'));
            } else {
                (socket as any).decoded = decoded;
                next();
            }
        });
    } else {
        next(new Error('Authentication Error: no query token present'));
    }
});

io.on('connection', (socket) => {
    console.log('user connected', (socket as any).decoded);

    socket.on('fcs:update', (update) => {
        console.log('updating field', update)
        socket.broadcast.emit('fcs:update', update);
    });

    socket.on('disconnect', () => {
        console.log('user disonnected');
    });
});

server.listen(3000, () => console.log('server started'));