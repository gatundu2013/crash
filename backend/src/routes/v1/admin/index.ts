import { Router } from "express";

export const adminRouter = Router();

adminRouter.get("/test", (req, res) => {
  res.json({ message: "Test admin router" });
});
