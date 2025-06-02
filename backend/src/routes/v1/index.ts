import { Router } from "express";
import { userRouter } from "./user.router";
import betRouter from "./betting";

export const router = Router();

router.use("/user", userRouter);
router.use("/bet", betRouter);
