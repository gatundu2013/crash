import { Router } from "express";
import {
  checkAuthStatus,
  loginUserController,
  logout,
  registerUserController,
} from "../../../controllers/auth";
import { verifyJwt } from "../../../middleware/verifyJwt";

const authRouter = Router();

authRouter.post("/signup", registerUserController);
authRouter.post("/signin", loginUserController);
authRouter.post("/logout", logout);
authRouter.get("/status", verifyJwt, checkAuthStatus);

export default authRouter;
