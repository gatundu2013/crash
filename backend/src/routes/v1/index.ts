import { Router } from "express";
import { userRouter } from "./user.router";

export const router = Router();

router.use("/user", userRouter);
