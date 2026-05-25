import type { Request, Response } from "express";

// Placeholder for future notification endpoints
export async function placeholder(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(501).json({ success: false, error: "Not implemented" });
}
