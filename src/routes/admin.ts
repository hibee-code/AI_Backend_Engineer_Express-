import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', adminController.listUsers);
router.get('/stats', adminController.stats);

export default router;
