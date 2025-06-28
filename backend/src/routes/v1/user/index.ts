import { Router } from "express";
import authRouter from "./auth.router";
import betHistory from "./betHistory.router";

const userRouter = Router();

userRouter.use("/auth", authRouter);
userRouter.use("/history", betHistory);

export default userRouter;
