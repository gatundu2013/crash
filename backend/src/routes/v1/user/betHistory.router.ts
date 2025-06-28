import { Router } from "express";
import { verifyJwt } from "../../../middleware/verifyJwt";
import { getPaginatedBetHistoryController } from "../../../controllers/betHistory";

const betHistoryRouter = Router();

betHistoryRouter.get(
  "/bethistory",
  verifyJwt,
  getPaginatedBetHistoryController
);

export default betHistoryRouter;
