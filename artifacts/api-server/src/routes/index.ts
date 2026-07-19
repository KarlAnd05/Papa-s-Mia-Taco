import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(adminRouter);
router.use(feedbackRouter);
router.use(ordersRouter);

export default router;
