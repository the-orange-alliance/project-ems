"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.localStrategy = exports.jwtStrategy = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const passport_jwt_1 = require("passport-jwt");
const jwtStrategy = (secretOrKey) => new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey
}, (jwtPayload, cb) => {
    return cb(null, jwtPayload);
});
exports.jwtStrategy = jwtStrategy;
const localStrategy = () => new passport_local_1.Strategy((username, password, done) => {
    if (password === 'admin') {
        return done(null, { id: 0, username });
    }
    else {
        return done(null, false);
    }
});
exports.localStrategy = localStrategy;
exports.requireAuth = passport_1.default.authenticate('jwt', { session: false });
//# sourceMappingURL=passport.js.map