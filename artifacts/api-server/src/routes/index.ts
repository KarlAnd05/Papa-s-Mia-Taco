import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import staffRouter from "./staff";
import settingsRouter from "./settings";
import customersRouter from "./customers";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";
import ordersRouter from "./orders";
import publicOrdersRouter from "./publicOrders";
import menuItemsRouter from "./menuItems";
import reservationsRouter from "./reservations";
import adminReservationsRouter from "./adminReservations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(staffRouter);
router.use(settingsRouter);
router.use(customersRouter);
router.use(adminRouter);
router.use(feedbackRouter);
router.use(ordersRouter);
router.use(publicOrdersRouter);
router.use(menuItemsRouter);
router.use(reservationsRouter);
router.use(adminReservationsRouter);

export default router;
