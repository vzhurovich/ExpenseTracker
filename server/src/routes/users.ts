import express from 'express';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Example: Get current user info
router.get('/me', (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ user: req.user });
});

export default router; 