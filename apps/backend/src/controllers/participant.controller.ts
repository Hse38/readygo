import type { Participant } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../lib/prisma";

type AddParticipantBody = {
  email: string;
  name?: string;
};

type UpdateParticipantStatusBody = {
  status: "accepted" | "declined";
};

function getParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function toParticipantResponse(participant: Participant) {
  return {
    id: participant.id,
    eventId: participant.eventId,
    userId: participant.userId,
    email: participant.email,
    name: participant.name,
    status: participant.status,
    inviteToken: participant.inviteToken,
    createdAt: participant.createdAt,
  };
}

export async function addParticipant(
  req: Request<{ id: string }, object, AddParticipantBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const eventId = getParam(req.params.id);
    if (!eventId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const email = req.body?.email?.trim().toLowerCase();
    const name = req.body?.name?.trim() || undefined;
    if (!email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, userId },
      include: { checklistItems: true },
    });

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const existingParticipant = await prisma.participant.findFirst({
      where: { eventId, email },
    });

    if (existingParticipant) {
      res.json({
        participant: toParticipantResponse(existingParticipant),
        inviteLink: `readygo://invite/${existingParticipant.inviteToken}`,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const participant = await prisma.participant.create({
      data: {
        eventId,
        userId: existingUser?.id ?? null,
        email,
        name,
      },
    });

    // Placeholder for product behavior: if participant user exists, the event should
    // appear in their participation list and checklist can be derived at read-time.
    // Current DB model stores event checklist at event-level, so no item duplication is needed.

    res.status(201).json({
      participant: toParticipantResponse(participant),
      inviteLink: `readygo://invite/${participant.inviteToken}`,
    });
  } catch (err) {
    console.error("Add participant error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getEventParticipants(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const eventId = getParam(req.params.id);
    if (!eventId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, userId },
      select: { id: true },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const participants = await prisma.participant.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, surname: true, email: true },
        },
      },
    });

    res.json({
      participants: participants.map((participant) => ({
        ...toParticipantResponse(participant),
        user: participant.user,
      })),
    });
  } catch (err) {
    console.error("Get participants error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateParticipantStatus(
  req: Request<{ participantId: string }, object, UpdateParticipantStatusBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const participantId = getParam(req.params.participantId);
    const status = req.body?.status;
    if (!participantId || !status || !["accepted", "declined"].includes(status)) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { event: { select: { userId: true } } },
    });
    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    const isOwner = participant.event.userId === userId;
    const isParticipantUser = participant.userId === userId;
    if (!isOwner && !isParticipantUser) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: { status },
    });

    res.json({ participant: toParticipantResponse(updated) });
  } catch (err) {
    console.error("Update participant status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInvitePreview(
  req: Request<{ token: string }>,
  res: Response
): Promise<void> {
  try {
    const token = getParam(req.params.token);
    if (!token) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { inviteToken: token },
      include: { event: true },
    });
    if (!participant) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    res.json({
      event: {
        id: participant.event.id,
        title: participant.event.title,
        type: participant.event.type,
        date: participant.event.date,
        location: participant.event.location,
      },
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        status: participant.status,
      },
    });
  } catch (err) {
    console.error("Get invite preview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
