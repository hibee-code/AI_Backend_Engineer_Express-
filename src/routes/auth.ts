import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Student
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: MyPassword123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post(
  '/register',
  validate(z.object({ body: authController.registerSchema })),
  async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/login',
  validate(z.object({ body: authController.loginSchema })),
  async (req, res, next) => {
    try {
      const result = await authService.login({
        ...req.body,
        deviceInfo: req.headers['user-agent'],
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/refresh',
  validate(z.object({ body: authController.refreshTokenSchema })),
  async (req, res, next) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/logout',
  validate(z.object({ body: authController.refreshTokenSchema })),
  async (req, res, next) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.json({ message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  },
);

// Not in the lesson: returns the logged-in user (protected route)
router.get('/me', authenticate, authController.me);

export default router;
