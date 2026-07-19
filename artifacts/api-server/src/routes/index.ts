import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(adminRouter);
router.use(feedbackRouter);

export default router;
