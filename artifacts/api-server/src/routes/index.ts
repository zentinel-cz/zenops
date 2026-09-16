import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import codebooksRouter from "./codebooks";
import accessoriesRouter from "./accessories";
import fellingRecordsRouter from "./fellingRecords";
import mowingRecordsRouter from "./mowingRecords";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./auditLogs";
import teamDailyRecordsRouter from "./teamDailyRecords";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(codebooksRouter);
router.use(accessoriesRouter);
router.use(fellingRecordsRouter);
router.use(mowingRecordsRouter);
router.use(dashboardRouter);
router.use(auditLogsRouter);
router.use(teamDailyRecordsRouter);

export default router;
