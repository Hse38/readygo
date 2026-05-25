import type { Request, Response } from "express";

export async function getEvents(_req: Request, res: Response): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}

export async function createEvent(_req: Request, res: Response): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}

export async function getEventById(_req: Request, res: Response): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}

export async function getEventChecklist(
  _req: Request,
  res: Response
): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}

export async function updateChecklistItem(
  _req: Request,
  res: Response
): Promise<void> {
  // TODO: implement
  res.status(501).json({ success: false, error: "Not implemented" });
}
