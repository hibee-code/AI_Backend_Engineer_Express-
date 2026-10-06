import { Router } from 'express';
import * as authService from '../services/auth.service';


const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const user = await authService.register({ ...req.body, correlationId: req.correlationId });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      deviceInfo: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken, req.correlationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken, req.correlationId);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

export default router;