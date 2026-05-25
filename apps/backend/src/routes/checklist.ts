import { Router } from "express";
import * as eventsController from "../controllers/events.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.put("/:itemId", eventsController.updateChecklistItem);

export default router;
