import { Router } from "express";
import { getProvablyFairResultController } from "../../../controllers/game/provablyFairController";

export const gameRouter = Router();

gameRouter.get("/provably-fair/:roundId", getProvablyFairResultController);
