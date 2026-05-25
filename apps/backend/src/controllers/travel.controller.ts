import type { Request, Response } from "express";

export async function getTravelTime(
  _req: Request,
  res: Response
): Promise<void> {
  // TODO: implement travel time via maps.service
  res.status(501).json({ success: false, error: "Not implemented" });
}
