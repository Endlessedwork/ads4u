import { Router } from 'express';
import { requireAdmin } from '../middleware.js';
import db from '../db.js';

const router = Router();

router.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, avatar_url, role, created_at, updated_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

router.put('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "member"' });
  }

  const userId = parseInt(req.params.id, 10);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(role, userId);

  res.json({ ok: true, id: userId, role });
});

export default router;
