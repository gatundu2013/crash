import { Router } from "express";
import { verifyJwt } from "../../../middleware/verifyJwt";
import {
  checkAuthStatusController,
  loginController,
  logoutController,
  registerController,
} from "../../../controllers/user/authController";
import { getPaginatedBetHistoryController } from "../../../controllers/user/betHistoryController";

export const userRouter = Router();

// Auth routes
userRouter.post("/auth/signup", registerController);
userRouter.post("/auth/signin", loginController);
userRouter.post("/auth/logout", logoutController);
userRouter.get("/auth/status", verifyJwt, checkAuthStatusController);

// Bet history routes
userRouter.get("/bets", verifyJwt, getPaginatedBetHistoryController);
