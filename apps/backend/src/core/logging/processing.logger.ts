import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ProcessingLogInput {
  eventId: string;
  stage: string;
  status: "started" | "success" | "failed";
  startedAt: Date;
  finishedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function logProcessingStage(input: ProcessingLogInput): Promise<void> {
  await prisma.eventProcessingLog.create({
    data: {
      eventId: input.eventId,
      stage: input.stage,
      status: input.status,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      durationMs:
        input.finishedAt != null ? input.finishedAt.getTime() - input.startedAt.getTime() : null,
      errorMessage: input.errorMessage ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
