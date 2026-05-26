import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { query, pool } from '../db/pool.js';

export const ticketsRouter = Router();

function canSeeAll(user) {
  return user.role === 'ADMIN';
}

function isTech(user) {
  return user.role === 'TECHNICIAN';
}

ticketsRouter.get('/', authRequired, async (req, res) => {
  const { status, priority, q } = req.query;
  const params = [];
  const where = [];

  if (!canSeeAll(req.user)) {
    if (isTech(req.user)) {
      params.push(req.user.id);
      where.push(`(t.assigned_to = $${params.length} OR t.assigned_to IS NULL)`);
    } else {
      params.push(req.user.id);
      where.push(`t.created_by = $${params.length}`);
    }
  }
  if (status) { params.push(status); where.push(`t.status = $${params.length}`); }
  if (priority) { params.push(priority); where.push(`t.priority = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`); }

  const sql = `
    SELECT t.*, creator.name AS creator_name, tech.name AS assigned_name
    FROM tickets t
    JOIN users creator ON creator.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.assigned_to
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY t.updated_at DESC
  `;
  const { rows } = await query(sql, params);
  res.json(rows);
});

ticketsRouter.post('/', authRequired, upload.single('attachment'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, description, category = 'Otro', priority = 'MEDIA' } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Título y descripción son obligatorios' });

    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO tickets (title, description, category, priority, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, category, priority, req.user.id]
    );
    const ticket = created.rows[0];

    await client.query(
      `INSERT INTO ticket_history (ticket_id, action, new_value, changed_by)
       VALUES ($1,'TICKET_CREADO',$2,$3)`,
      [ticket.id, `Ticket creado con prioridad ${priority}`, req.user.id]
    );

    if (req.file) {
      await client.query(
        `INSERT INTO attachments (ticket_id, file_name, file_path, mime_type, uploaded_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [ticket.id, req.file.originalname, req.file.path, req.file.mimetype, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(ticket);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

ticketsRouter.get('/:id', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, creator.name AS creator_name, tech.name AS assigned_name
     FROM tickets t
     JOIN users creator ON creator.id = t.created_by
     LEFT JOIN users tech ON tech.id = t.assigned_to
     WHERE t.id=$1`, [req.params.id]
  );
  const ticket = rows[0];
  if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
  if (req.user.role === 'USER' && ticket.created_by !== req.user.id) return res.status(403).json({ message: 'No autorizado' });
  if (req.user.role === 'TECHNICIAN' && ticket.assigned_to && ticket.assigned_to !== req.user.id) return res.status(403).json({ message: 'No autorizado' });

  const comments = await query(
    `SELECT c.*, u.name AS user_name, u.role AS user_role
     FROM ticket_comments c JOIN users u ON u.id=c.user_id
     WHERE c.ticket_id=$1 AND ($2::boolean OR c.is_internal=false)
     ORDER BY c.created_at ASC`,
    [ticket.id, req.user.role !== 'USER']
  );
  const history = await query(
    `SELECT h.*, u.name AS changed_by_name
     FROM ticket_history h LEFT JOIN users u ON u.id=h.changed_by
     WHERE h.ticket_id=$1 ORDER BY h.created_at ASC`, [ticket.id]
  );
  const attachments = await query('SELECT id, file_name, mime_type, created_at FROM attachments WHERE ticket_id=$1', [ticket.id]);

  res.json({ ...ticket, comments: comments.rows, history: history.rows, attachments: attachments.rows });
});

ticketsRouter.put('/:id', authRequired, requireRole('ADMIN','TECHNICIAN'), async (req, res) => {
  const allowed = ['status', 'priority', 'assigned_to'];
  const changes = Object.fromEntries(Object.entries(req.body).filter(([k, v]) => allowed.includes(k) && v !== undefined));
  if (!Object.keys(changes).length) return res.status(400).json({ message: 'No hay cambios válidos' });

  const current = await query('SELECT * FROM tickets WHERE id=$1', [req.params.id]);
  const ticket = current.rows[0];
  if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(changes)) {
    params.push(value || null);
    sets.push(`${key}=$${params.length}`);
  }
  if (changes.status === 'RESUELTO') sets.push('resolved_at=NOW()');
  sets.push('updated_at=NOW()');
  params.push(req.params.id);

  const updated = await query(`UPDATE tickets SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`, params);

  for (const [key, value] of Object.entries(changes)) {
    await query(
      `INSERT INTO ticket_history (ticket_id, action, old_value, new_value, changed_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, `CAMBIO_${key.toUpperCase()}`, ticket[key], value, req.user.id]
    );
  }

  res.json(updated.rows[0]);
});

ticketsRouter.post('/:id/comments', authRequired, async (req, res) => {
  const { comment, is_internal = false } = req.body;
  if (!comment) return res.status(400).json({ message: 'Comentario requerido' });
  if (is_internal && req.user.role === 'USER') return res.status(403).json({ message: 'Solo soporte puede crear notas internas' });

  const { rows } = await query(
    `INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, req.user.id, comment, Boolean(is_internal)]
  );
  await query(
    `INSERT INTO ticket_history (ticket_id, action, new_value, changed_by)
     VALUES ($1,'COMENTARIO_AGREGADO',$2,$3)`,
    [req.params.id, is_internal ? 'Nota interna agregada' : 'Comentario público agregado', req.user.id]
  );
  res.status(201).json(rows[0]);
});
