import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/apple", authController.appleSignIn);
router.post("/google", authController.googleSignIn);

export default router;
