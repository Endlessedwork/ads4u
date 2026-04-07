import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth, requireAdmin } from '../server/middleware.js';

function createApp(middleware) {
  const app = express();
  app.use(express.json());
  app.get('/test', middleware, (req, res) => res.json({ ok: true }));
  return app;
}

describe('requireAuth', () => {
  it('returns 401 when no user is authenticated', async () => {
    const app = createApp(requireAuth);
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('allows request when user is authenticated', async () => {
    const app = createApp(requireAuth);
    // Inject user before middleware
    app.use((req, res, next) => { req.user = { id: 1, role: 'member' }; next(); });
    // Re-add the route after user injection
    const app2 = express();
    app2.use((req, res, next) => { req.user = { id: 1, role: 'member' }; next(); });
    app2.get('/test', requireAuth, (req, res) => res.json({ ok: true }));

    const res = await request(app2).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('requireAdmin', () => {
  it('returns 401 when no user is authenticated', async () => {
    const app = createApp(requireAdmin);
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('returns 403 when user is not admin', async () => {
    const app = express();
    app.use((req, res, next) => { req.user = { id: 1, role: 'member' }; next(); });
    app.get('/test', requireAdmin, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  it('allows request when user is admin', async () => {
    const app = express();
    app.use((req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); });
    app.get('/test', requireAdmin, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
