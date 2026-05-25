import type { Request, Response } from "express";

export async function getProfile(_req: Request, res: Response): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}

export async function updateProfile(
  _req: Request,
  res: Response
): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}
