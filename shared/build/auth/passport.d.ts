/// <reference types="node" />
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy } from 'passport-jwt';
export declare const jwtStrategy: (secretOrKey: string | Buffer | undefined) => JWTStrategy;
export declare const localStrategy: () => LocalStrategy;
export declare const requireAuth: any;
