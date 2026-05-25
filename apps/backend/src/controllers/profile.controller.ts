import type { User } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import type { ProfileResponse, UpdateProfileBody } from "../types/profile.types";
import { TRANSPORT_MODES, WORK_DAYS } from "../types/profile.types";

function toProfileUser(user: User): ProfileResponse["user"] {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    occupation: user.occupation,
    workLocation: user.workLocation,
    workLocationLat: user.workLocationLat,
    workLocationLng: user.workLocationLng,
    homeLocation: user.homeLocation,
    homeLocationLat: user.homeLocationLat,
    homeLocationLng: user.homeLocationLng,
    workDays: user.workDays,
    transportMode: user.transportMode,
    morningAlarm: user.morningAlarm,
    createdAt: user.createdAt,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidOptionalCoordinate(value: unknown): value is number | undefined {
  if (value === undefined) return true;
  return typeof value === "number" && !Number.isNaN(value);
}

function validateUpdateProfileBody(body: unknown): UpdateProfileBody | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;

  const requiredStrings = [
    "name",
    "surname",
    "occupation",
    "workLocation",
    "homeLocation",
  ] as const;

  for (const field of requiredStrings) {
    if (!isNonEmptyString(data[field])) return null;
  }

  if (!Array.isArray(data.workDays) || data.workDays.length === 0) return null;

  const workDays = data.workDays as unknown[];
  if (
    !workDays.every(
      (day) =>
        typeof day === "string" &&
        (WORK_DAYS as readonly string[]).includes(day.toLowerCase())
    )
  ) {
    return null;
  }

  if (
    typeof data.transportMode !== "string" ||
    !(TRANSPORT_MODES as readonly string[]).includes(data.transportMode)
  ) {
    return null;
  }

  if (typeof data.morningAlarm !== "boolean") return null;

  if (
    !isValidOptionalCoordinate(data.workLocationLat) ||
    !isValidOptionalCoordinate(data.workLocationLng) ||
    !isValidOptionalCoordinate(data.homeLocationLat) ||
    !isValidOptionalCoordinate(data.homeLocationLng)
  ) {
    return null;
  }

  return {
    name: (data.name as string).trim(),
    surname: (data.surname as string).trim(),
    occupation: (data.occupation as string).trim(),
    workLocation: (data.workLocation as string).trim(),
    workLocationLat: data.workLocationLat as number | undefined,
    workLocationLng: data.workLocationLng as number | undefined,
    homeLocation: (data.homeLocation as string).trim(),
    homeLocationLat: data.homeLocationLat as number | undefined,
    homeLocationLng: data.homeLocationLng as number | undefined,
    workDays: workDays.map((day) => (day as string).toLowerCase()),
    transportMode: data.transportMode as UpdateProfileBody["transportMode"],
    morningAlarm: data.morningAlarm,
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const response: ProfileResponse = { user: toProfileUser(user) };
    res.json(response);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfile(
  req: Request<object, object, UpdateProfileBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = validateUpdateProfileBody(req.body);
    if (!body) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        surname: body.surname,
        occupation: body.occupation,
        workLocation: body.workLocation,
        workLocationLat: body.workLocationLat ?? null,
        workLocationLng: body.workLocationLng ?? null,
        homeLocation: body.homeLocation,
        homeLocationLat: body.homeLocationLat ?? null,
        homeLocationLng: body.homeLocationLng ?? null,
        workDays: body.workDays,
        transportMode: body.transportMode,
        morningAlarm: body.morningAlarm,
      },
    });

    const response: ProfileResponse = { user: toProfileUser(user) };
    res.json(response);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
