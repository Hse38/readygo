import { Router } from "express";

import * as participantController from "../controllers/participant.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/invite/:token", participantController.getInvitePreview);

router.post("/events/:id/participants", authMiddleware, participantController.addParticipant);
router.get("/events/:id/participants", authMiddleware, participantController.getEventParticipants);
router.put(
  "/participants/:participantId/status",
  authMiddleware,
  participantController.updateParticipantStatus
);

export default router;
