import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate({ body: authController.registerSchema }),
  authController.register,
);
authRouter.post('/login', validate({ body: authController.loginSchema }), authController.login);
authRouter.get('/me', authenticate, authController.me);
