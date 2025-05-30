import { Router } from "express";
import {
  checkAuthStatus,
  loginUserController,
  registerUserController,
} from "../../controllers/auth";
import { verifyJwt } from "../../middleware/verifyJwt";

export const userRouter = Router();

userRouter.post("/auth/signup", registerUserController);
userRouter.post("/auth/signin", loginUserController);

userRouter.post("/auth/status", verifyJwt, checkAuthStatus);
