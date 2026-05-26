import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db/pool.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', authRequired, async (req, res) => {
  const params = [];
  let scope = '';
  if (req.user.role === 'USER') { params.push(req.user.id); scope = `WHERE created_by=$1`; }
  if (req.user.role === 'TECHNICIAN') { params.push(req.user.id); scope = `WHERE assigned_to=$1`; }

  const totals = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='NUEVO')::int AS nuevos,
      COUNT(*) FILTER (WHERE status='EN_PROCESO')::int AS en_proceso,
      COUNT(*) FILTER (WHERE status='RESUELTO')::int AS resueltos,
      COUNT(*) FILTER (WHERE priority='URGENTE')::int AS urgentes,
      COUNT(*) FILTER (WHERE priority='URGENTE' AND status NOT IN ('RESUELTO','CERRADO') AND created_at < NOW() - INTERVAL '4 hours')::int AS vencidos,
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL), 2), 0)::float AS tiempo_promedio_horas
    FROM tickets ${scope}
  `, params);

  const byStatus = await query(`SELECT status, COUNT(*)::int total FROM tickets ${scope} GROUP BY status`, params);
  const byPriority = await query(`SELECT priority, COUNT(*)::int total FROM tickets ${scope} GROUP BY priority`, params);
  res.json({ summary: totals.rows[0], byStatus: byStatus.rows, byPriority: byPriority.rows });
});
