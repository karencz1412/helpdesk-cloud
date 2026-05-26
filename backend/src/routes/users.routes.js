import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';

export const usersRouter = Router();

usersRouter.get('/technicians', authRequired, async (_req, res) => {
  const { rows } = await query("SELECT id, name, email, role FROM users WHERE role IN ('TECHNICIAN','ADMIN') ORDER BY name");
  res.json(rows);
});

usersRouter.get('/', authRequired, requireRole('ADMIN'), async (_req, res) => {
  const { rows } = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});
