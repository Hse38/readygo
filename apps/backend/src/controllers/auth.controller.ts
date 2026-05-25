import appleSigninAuth from "apple-signin-auth";
import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { config } from "../lib/config";
import { signAuthToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import type {
  AppleSignInBody,
  AuthResponse,
  AuthUserResponse,
  GoogleSignInBody,
} from "../types/auth.types";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
}): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
  };
}

function sendAuthResponse(
  res: Response,
  user: { id: string; email: string; name: string | null; surname: string | null }
): void {
  const token = signAuthToken({ userId: user.id, email: user.email });
  const response: AuthResponse = { token, user: toAuthUser(user) };
  res.json(response);
}

async function findOrCreateUserByEmail(
  email: string,
  name: string,
  surname: string
): Promise<{ id: string; email: string; name: string | null; surname: string | null }> {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: { email, name, surname },
  });
}

export async function appleSignIn(
  req: Request<object, object, AppleSignInBody>,
  res: Response
): Promise<void> {
  try {
    const { identityToken, fullName } = req.body;

    if (!identityToken || typeof identityToken !== "string") {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!config.apple.clientId) {
      console.error("APPLE_CLIENT_ID is not configured");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let appleClaims: { sub: string; email?: string };
    try {
      appleClaims = await appleSigninAuth.verifyIdToken(identityToken, {
        audience: config.apple.clientId,
      });
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const email = appleClaims.email;
    if (!email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const name = fullName?.givenName ?? "";
    const surname = fullName?.familyName ?? "";

    const user = await findOrCreateUserByEmail(email, name, surname);
    sendAuthResponse(res, user);
  } catch (err) {
    console.error("Apple sign in error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function googleSignIn(
  req: Request<object, object, GoogleSignInBody>,
  res: Response
): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!config.google.clientId) {
      console.error("GOOGLE_CLIENT_ID is not configured");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const client = new OAuth2Client(config.google.clientId);

    let payload: {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
    };

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const email = payload.email;
    if (!email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const name = payload.given_name ?? "";
    const surname = payload.family_name ?? "";

    const user = await findOrCreateUserByEmail(email, name, surname);
    sendAuthResponse(res, user);
  } catch (err) {
    console.error("Google sign in error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
