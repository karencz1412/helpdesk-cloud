import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    const payload = jwt.verify(token, env.jwtSecret);
    const { rows } = await query('SELECT id, name, email, role FROM users WHERE id=$1', [payload.id]);
    if (!rows[0]) return res.status(401).json({ message: 'Usuario no válido' });
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
