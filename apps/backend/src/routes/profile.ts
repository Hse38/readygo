import { Router } from "express";
import * as profileController from "../controllers/profile.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", profileController.getProfile);
router.post("/", profileController.updateProfile);

export default router;
