import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";
import ordersRouter from "./orders";
import menuItemsRouter from "./menuItems";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(adminRouter);
router.use(feedbackRouter);
router.use(ordersRouter);
router.use(menuItemsRouter);

export default router;
