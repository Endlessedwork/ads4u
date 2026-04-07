import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { createTestDb, createTestUser } from './setup.js';
import { requireAdmin } from '../server/middleware.js';

let db;
let adminUser;
let memberUser;

function buildAdminRouter(testDb) {
  const router = Router();

  router.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = testDb.prepare(
      'SELECT id, email, name, avatar_url, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    ).all();
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
    const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    testDb.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId);
    res.json({ ok: true, id: userId, role });
  });

  return router;
}

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use(buildAdminRouter(db));
  return app;
}

beforeEach(() => {
  db = createTestDb();
  adminUser = createTestUser(db, { google_id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' });
  memberUser = createTestUser(db, { google_id: 'member-1', email: 'member@test.com', name: 'Member', role: 'member' });
});

describe('GET /api/admin/users', () => {
  it('returns 401 when not authenticated', async () => {
    const app = createApp(null);
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const app = createApp(memberUser);
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(403);
  });

  it('returns all users for admin', async () => {
    const app = createApp(adminUser);
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('does not expose google_id', async () => {
    const app = createApp(adminUser);
    const res = await request(app).get('/api/admin/users');
    expect(res.body[0].google_id).toBeUndefined();
  });
});

describe('PUT /api/admin/users/:id/role', () => {
  it('returns 400 for invalid role', async () => {
    const app = createApp(adminUser);
    const res = await request(app).put(`/api/admin/users/${memberUser.id}/role`).send({ role: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('admin');
  });

  it('returns 400 when changing own role', async () => {
    const app = createApp(adminUser);
    const res = await request(app).put(`/api/admin/users/${adminUser.id}/role`).send({ role: 'member' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('own role');
  });

  it('returns 404 for non-existent user', async () => {
    const app = createApp(adminUser);
    const res = await request(app).put('/api/admin/users/999/role').send({ role: 'admin' });
    expect(res.status).toBe(404);
  });

  it('changes user role successfully', async () => {
    const app = createApp(adminUser);
    const res = await request(app).put(`/api/admin/users/${memberUser.id}/role`).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.role).toBe('admin');

    const updated = db.prepare('SELECT role FROM users WHERE id = ?').get(memberUser.id);
    expect(updated.role).toBe('admin');
  });
});
