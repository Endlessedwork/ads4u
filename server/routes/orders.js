import { Router } from 'express';
import { addOrder, getOrderStatus, refillOrder, getRefillStatus, cancelOrder } from '../ads4u-client.js';
import { requireAuth } from '../middleware.js';
import db from '../db.js';

const router = Router();

// Place new order
router.post('/api/orders', requireAuth, async (req, res) => {
  const { serviceId, serviceName, link, quantity, comments } = req.body || {};

  if (!serviceId || !link || !quantity) {
    return res.status(400).json({ error: 'serviceId, link, and quantity are required' });
  }

  try {
    new URL(link);
  } catch {
    return res.status(400).json({ error: 'Invalid link URL' });
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  try {
    const result = await addOrder({ serviceId, link, quantity: qty, comments: comments || undefined });

    const row = db.prepare(`
      INSERT INTO orders (user_id, ads4u_order_id, service_id, service_name, link, quantity, charge)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      String(result.order),
      serviceId,
      serviceName || `Service #${serviceId}`,
      link,
      qty,
      result.charge || null
    );

    res.json({
      id: row.lastInsertRowid,
      ads4u_order_id: String(result.order),
      charge: result.charge,
    });
  } catch (err) {
    console.error('Failed to place order:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// List orders (member: own only, admin: all)
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

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM orders o ${whereClause}`
  ).get(...params);

  const orders = db.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    orders,
    pagination: {
      page,
      limit,
      total: countRow.total,
      pages: Math.ceil(countRow.total / limit),
    },
  });
});

// Check order status (syncs with ads4u)
router.get('/api/orders/:id/status', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await getOrderStatus(order.ads4u_order_id);

    db.prepare(`
      UPDATE orders SET status = ?, charge = ?, remains = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(result.status, result.charge, result.remains, order.id);

    res.json({
      id: order.id,
      status: result.status,
      charge: result.charge,
      remains: result.remains,
      start_count: result.start_count,
      currency: result.currency,
    });
  } catch (err) {
    console.error('Failed to check order status:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Refill order
router.post('/api/orders/:id/refill', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await refillOrder(order.ads4u_order_id);
    res.json({ refill: result.refill });
  } catch (err) {
    console.error('Failed to refill order:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to refill order' });
  }
});

// Refill status
router.get('/api/orders/:id/refill-status', requireAuth, async (req, res) => {
  const { refillId } = req.query;
  if (!refillId) {
    return res.status(400).json({ error: 'refillId query parameter is required' });
  }

  try {
    const result = await getRefillStatus(refillId);
    res.json(result);
  } catch (err) {
    console.error('Failed to check refill status:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to check refill status' });
  }
});

// Cancel order
router.post('/api/orders/:id/cancel', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await cancelOrder(order.ads4u_order_id);

    db.prepare(`
      UPDATE orders SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(order.id);

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to cancel order:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
