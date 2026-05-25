import { Router } from "express";
import * as eventsController from "../controllers/events.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", eventsController.getEvents);
router.post("/", eventsController.createEvent);
router.get("/:id", eventsController.getEventById);
router.get("/:id/checklist", eventsController.getEventChecklist);

export default router;
