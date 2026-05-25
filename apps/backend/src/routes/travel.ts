import { Router } from "express";
import * as travelController from "../controllers/travel.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/travel-time", travelController.getTravelTime);

export default router;
