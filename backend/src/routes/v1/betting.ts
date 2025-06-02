import { Router } from "express";
import { placeBetController } from "../../controllers/betting";

export const betRouter = Router();

betRouter.post("/placebet", placeBetController);

export default betRouter;
