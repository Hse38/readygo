import type { Request, Response } from "express";
import { mapsService } from "../services/maps.service";
import { TRANSPORT_MODES } from "../types/profile.types";

function getQueryString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return "";
}

export async function getTravelTime(req: Request, res: Response): Promise<void> {
  try {
    const origin = getQueryString(req.query.origin);
    const destination = getQueryString(req.query.destination);
    const mode = getQueryString(req.query.mode);
    const eventTime = getQueryString(req.query.eventTime);

    if (!origin || !destination || !mode || !eventTime) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!(TRANSPORT_MODES as readonly string[]).includes(mode)) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const eventDate = new Date(eventTime);
    if (Number.isNaN(eventDate.getTime())) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const travel = await mapsService.getTravelTime(origin, destination, mode);
    const departureTime = new Date(
      eventDate.getTime() - travel.durationSeconds * 1000
    );

    res.json({
      durationSeconds: travel.durationSeconds,
      durationText: travel.durationText,
      distanceText: travel.distanceText,
      departureTime: departureTime.toISOString(),
      transitDetails: travel.transitDetails,
    });
  } catch (err) {
    console.error("Get travel time error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
