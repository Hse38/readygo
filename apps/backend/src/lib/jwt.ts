import jwt from "jsonwebtoken";
import { config } from "./config";

const AUTH_TOKEN_EXPIRES_IN = "30d";

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: AUTH_TOKEN_EXPIRES_IN,
  });
}
