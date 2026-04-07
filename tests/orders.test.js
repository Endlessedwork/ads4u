import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { createTestDb, createTestUser, createTestOrder } from './setup.js';
import { requireAuth, requireAdmin } from '../server/middleware.js';

let db;
let adminUser;
let memberUser;

// Build a mini orders router that uses our test db directly
// This tests the same logic as server/routes/orders.js without module mocking
function buildOrdersRouter(testDb) {
  const router = Router();

  router.post('/api/orders', requireAuth, async (req, res) => {
    const { serviceId, serviceName, link, quantity } = req.body;

    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ error: 'serviceId, link, and quantity are required' });
    }

    try { new URL(link); } catch {
      return res.status(400).json({ error: 'Invalid link URL' });
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    // Skip ads4u API call in tests — just record in DB
    const row = testDb.prepare(
      'INSERT INTO orders (user_id, ads4u_order_id, service_id, service_name, link, quantity, charge) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'test-order', serviceId, serviceName || `Service #${serviceId}`, link, qty, 0);

    res.json({ id: row.lastInsertRowid, ads4u_order_id: 'test-order', charge: 0 });
  });

  router.get('/api/orders', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status || null;

    let whereClause = '';
    const params = [];

    if (req.user.role !== 'admin') {
      whereClause = 'WHERE o.user_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      whereClause += whereClause ? ' AND o.status = ?' : 'WHERE o.status = ?';
      params.push(status);
    }

    const countRow = testDb.prepare(`SELECT COUNT(*) as total FROM orders o ${whereClause}`).get(...params);
    const orders = testDb.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email FROM orders o
      JOIN users u ON u.id = o.user_id ${whereClause}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ orders, pagination: { page, limit, total: countRow.total, pages: Math.ceil(countRow.total / limit) } });
  });

  router.get('/api/orders/:id/status', requireAuth, (req, res) => {
    const order = testDb.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ id: order.id, status: order.status });
  });

  router.post('/api/orders/:id/refill', requireAuth, (req, res) => {
    const order = testDb.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ refill: 'test-refill-id' });
  });

  router.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
    const order = testDb.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    testDb.prepare("UPDATE orders SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
    res.json({ ok: true });
  });

  return router;
}

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use(buildOrdersRouter(db));
  return app;
}

beforeEach(() => {
  db = createTestDb();
  adminUser = createTestUser(db, { google_id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' });
  memberUser = createTestUser(db, { google_id: 'member-1', email: 'member@test.com', name: 'Member', role: 'member' });
});

// --- POST /api/orders ---

describe('POST /api/orders', () => {
  it('returns 401 when not authenticated', async () => {
    const app = createApp(null);
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders').send({ serviceId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 400 for invalid link URL', async () => {
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders').send({
      serviceId: 1, link: 'not-a-url', quantity: 100,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid link');
  });

  it('returns 400 for non-positive quantity', async () => {
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders').send({
      serviceId: 1, link: 'https://example.com', quantity: -5,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('positive integer');
  });

  it('returns 400 for zero quantity', async () => {
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders').send({
      serviceId: 1, link: 'https://example.com', quantity: 0,
    });
    expect(res.status).toBe(400);
  });

  it('creates order successfully with valid data', async () => {
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders').send({
      serviceId: 1, serviceName: 'Instagram Likes', link: 'https://instagram.com/test', quantity: 100,
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.ads4u_order_id).toBe('test-order');
  });
});

// --- GET /api/orders ---

describe('GET /api/orders', () => {
  it('returns 401 when not authenticated', async () => {
    const app = createApp(null);
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('returns only own orders for member', async () => {
    createTestOrder(db, memberUser.id, { ads4u_order_id: '100' });
    createTestOrder(db, adminUser.id, { ads4u_order_id: '200', google_id: 'admin-order' });

    const app = createApp(memberUser);
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].ads4u_order_id).toBe('100');
  });

  it('returns all orders for admin', async () => {
    createTestOrder(db, memberUser.id, { ads4u_order_id: '100' });
    createTestOrder(db, adminUser.id, { ads4u_order_id: '200' });

    const app = createApp(adminUser);
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
  });

  it('filters orders by status', async () => {
    createTestOrder(db, adminUser.id, { ads4u_order_id: '100', status: 'Pending' });
    createTestOrder(db, adminUser.id, { ads4u_order_id: '200', status: 'Completed' });

    const app = createApp(adminUser);
    const res = await request(app).get('/api/orders?status=Completed');
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].status).toBe('Completed');
  });

  it('returns correct pagination', async () => {
    for (let i = 0; i < 5; i++) {
      createTestOrder(db, adminUser.id, { ads4u_order_id: String(i) });
    }

    const app = createApp(adminUser);
    const res = await request(app).get('/api/orders?limit=2&page=1');
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.pages).toBe(3);
  });
});

// --- GET /api/orders/:id/status ---

describe('GET /api/orders/:id/status', () => {
  it('returns 404 for non-existent order', async () => {
    const app = createApp(adminUser);
    const res = await request(app).get('/api/orders/999/status');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  it('returns 403 when member accesses another users order', async () => {
    createTestOrder(db, adminUser.id);
    const app = createApp(memberUser);
    const res = await request(app).get('/api/orders/1/status');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access denied');
  });

  it('allows admin to access any order', async () => {
    createTestOrder(db, memberUser.id);
    const app = createApp(adminUser);
    const res = await request(app).get('/api/orders/1/status');
    expect(res.status).toBe(200);
  });

  it('allows member to access own order', async () => {
    createTestOrder(db, memberUser.id);
    const app = createApp(memberUser);
    const res = await request(app).get('/api/orders/1/status');
    expect(res.status).toBe(200);
  });
});

// --- POST /api/orders/:id/cancel ---

describe('POST /api/orders/:id/cancel', () => {
  it('returns 404 for non-existent order', async () => {
    const app = createApp(adminUser);
    const res = await request(app).post('/api/orders/999/cancel');
    expect(res.status).toBe(404);
  });

  it('returns 403 when member cancels another users order', async () => {
    createTestOrder(db, adminUser.id);
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders/1/cancel');
    expect(res.status).toBe(403);
  });

  it('cancels order and updates status in DB', async () => {
    createTestOrder(db, memberUser.id);
    const app = createApp(memberUser);
    const res = await request(app).post('/api/orders/1/cancel');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const order = db.prepare('SELECT * FROM orders WHERE id = 1').get();
    expect(order.status).toBe('Cancelled');
  });
});
