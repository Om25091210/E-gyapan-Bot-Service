import express, { Express, Request, Response, NextFunction } from 'express';
import verify_controller from '../controllers/Verify_webhook';
import sendTask from '../controllers/sendTask';
import sendHSM from '../controllers/sendHSM';

const router: Express = express();

router.post("/verify",verify_controller);
router.post("/sendTask",sendTask);
router.post("/sendHSM",sendHSM);

export default router;