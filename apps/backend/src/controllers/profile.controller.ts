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

function validatePartialUpdateProfileBody(
  body: unknown
): Partial<UpdateProfileBody> | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const updateData: Partial<UpdateProfileBody> = {};

  if ("name" in data) {
    if (!isNonEmptyString(data.name)) return null;
    updateData.name = data.name.trim();
  }
  if ("surname" in data) {
    if (!isNonEmptyString(data.surname)) return null;
    updateData.surname = data.surname.trim();
  }
  if ("occupation" in data) {
    if (!isNonEmptyString(data.occupation)) return null;
    updateData.occupation = data.occupation.trim();
  }
  if ("workLocation" in data) {
    if (!isNonEmptyString(data.workLocation)) return null;
    updateData.workLocation = data.workLocation.trim();
  }
  if ("homeLocation" in data) {
    if (!isNonEmptyString(data.homeLocation)) return null;
    updateData.homeLocation = data.homeLocation.trim();
  }

  if ("workDays" in data) {
    if (!Array.isArray(data.workDays)) return null;
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
    updateData.workDays = workDays.map((day) => (day as string).toLowerCase());
  }

  if ("transportMode" in data) {
    if (
      typeof data.transportMode !== "string" ||
      !(TRANSPORT_MODES as readonly string[]).includes(data.transportMode)
    ) {
      return null;
    }
    updateData.transportMode = data.transportMode as UpdateProfileBody["transportMode"];
  }

  if ("morningAlarm" in data) {
    if (typeof data.morningAlarm !== "boolean") return null;
    updateData.morningAlarm = data.morningAlarm;
  }

  if ("workLocationLat" in data) {
    if (!isValidOptionalCoordinate(data.workLocationLat)) return null;
    updateData.workLocationLat = data.workLocationLat as number | undefined;
  }
  if ("workLocationLng" in data) {
    if (!isValidOptionalCoordinate(data.workLocationLng)) return null;
    updateData.workLocationLng = data.workLocationLng as number | undefined;
  }
  if ("homeLocationLat" in data) {
    if (!isValidOptionalCoordinate(data.homeLocationLat)) return null;
    updateData.homeLocationLat = data.homeLocationLat as number | undefined;
  }
  if ("homeLocationLng" in data) {
    if (!isValidOptionalCoordinate(data.homeLocationLng)) return null;
    updateData.homeLocationLng = data.homeLocationLng as number | undefined;
  }

  return updateData;
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

export async function partialUpdateProfile(
  req: Request<object, object, Partial<UpdateProfileBody>>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = validatePartialUpdateProfileBody(req.body);
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
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.surname !== undefined ? { surname: body.surname } : {}),
        ...(body.occupation !== undefined ? { occupation: body.occupation } : {}),
        ...(body.workLocation !== undefined ? { workLocation: body.workLocation } : {}),
        ...(body.workLocationLat !== undefined
          ? { workLocationLat: body.workLocationLat }
          : {}),
        ...(body.workLocationLng !== undefined
          ? { workLocationLng: body.workLocationLng }
          : {}),
        ...(body.homeLocation !== undefined ? { homeLocation: body.homeLocation } : {}),
        ...(body.homeLocationLat !== undefined
          ? { homeLocationLat: body.homeLocationLat }
          : {}),
        ...(body.homeLocationLng !== undefined
          ? { homeLocationLng: body.homeLocationLng }
          : {}),
        ...(body.workDays !== undefined ? { workDays: body.workDays } : {}),
        ...(body.transportMode !== undefined
          ? { transportMode: body.transportMode }
          : {}),
        ...(body.morningAlarm !== undefined ? { morningAlarm: body.morningAlarm } : {}),
      },
    });

    const response: ProfileResponse = { user: toProfileUser(user) };
    res.json(response);
  } catch (err) {
    console.error("Partial update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
