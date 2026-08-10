import express from 'express';
import {
  saveFCMToken,
  sendTestNotification
} from '../controllers/firebase.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/fcm-token', saveFCMToken);

router.post(
  '/send-test',
  authenticate,
  sendTestNotification
);

export default router;