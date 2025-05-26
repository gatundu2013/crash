import { Router } from "express";
import {
  loginUserController,
  registerUserController,
} from "../../controllers/auth";

export const userRouter = Router();

userRouter.post("/auth/signup", registerUserController);
userRouter.post("/auth/signin", loginUserController);
