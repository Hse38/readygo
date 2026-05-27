import cors from "cors";
import express from "express";
import { config } from "./lib/config";
import type { HealthResponse } from "./types/api.types";
import authRoutes from "./routes/auth";
import checklistRoutes from "./routes/checklist";
import eventsRoutes from "./routes/events";
import notificationsRoutes from "./routes/notifications";
import profileRoutes from "./routes/profile";
import participantRoutes from "./routes/participants";
import travelRoutes from "./routes/travel";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = { status: "ok" };
  res.json(response);
});

app.use("/auth", authRoutes);
app.use("/events", eventsRoutes);
app.use("/checklist", checklistRoutes);
app.use("/profile", profileRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/", participantRoutes);
app.use("/", travelRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
);

app.listen(config.port, () => {
  console.log(`ReadyGo API listening on port ${config.port}`);
});

export default app;
