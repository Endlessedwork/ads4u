import express from 'express';
import session from 'express-session';
import passport from 'passport';
import Database from 'better-sqlite3';
import { requireAuth, requireAdmin, apiLimiter } from '../server/middleware.js';

// Create a fresh in-memory DB for each test suite
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ads4u_order_id TEXT,
      service_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      charge REAL,
      remains INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}

// Create test user and return it
export function createTestUser(db, overrides = {}) {
  const defaults = {
    google_id: 'test-google-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: '',
    role: 'member',
  };
  const user = { ...defaults, ...overrides };

  const result = db.prepare(
    'INSERT INTO users (google_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?)'
  ).run(user.google_id, user.email, user.name, user.avatar_url, user.role);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

// Create test order and return it
export function createTestOrder(db, userId, overrides = {}) {
  const defaults = {
    ads4u_order_id: '12345',
    service_id: 1,
    service_name: 'Test Service',
    link: 'https://example.com/test',
    quantity: 100,
    status: 'Pending',
    charge: 1.5,
  };
  const order = { ...defaults, ...overrides };

  const result = db.prepare(
    'INSERT INTO orders (user_id, ads4u_order_id, service_id, service_name, link, quantity, status, charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, order.ads4u_order_id, order.service_id, order.service_name, order.link, order.quantity, order.status, order.charge);

  return db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
}

// Create Express app with mock auth (inject user into req)
export function createTestApp(db, user = null) {
  const app = express();
  app.use(express.json());

  // Mock auth: inject user into req
  app.use((req, res, next) => {
    if (user) {
      req.user = user;
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  return app;
}
