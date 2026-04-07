import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import db from './db.js';

const SqliteSessionStore = SqliteStore(session);

export function setupAuth(app) {
  app.use(session({
    store: new SqliteSessionStore({
      client: db,
      expired: { clear: true, intervalMs: 900000 },
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || null);
  });

  const callbackURL = process.env.GOOGLE_CALLBACK_URL
    || `http://localhost:${process.env.PORT || 3000}/auth/google/callback`;

  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    }, (accessToken, refreshToken, profile, done) => {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value || '';
      const name = profile.displayName || '';
      const avatarUrl = profile.photos?.[0]?.value || '';

      let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

      if (user) {
        db.prepare(`
          UPDATE users SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(name, avatarUrl, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      } else {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const role = userCount === 0 ? 'admin' : 'member';

        const result = db.prepare(`
          INSERT INTO users (google_id, email, name, avatar_url, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(googleId, email, name, avatarUrl, role);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }

      done(null, user);
    }));

    app.get('/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email'],
    }));

    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/#/login' }),
      (req, res) => res.redirect('/')
    );
  }

  app.post('/auth/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ ok: true });
      });
    });
  });

  app.get('/api/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { google_id, ...safeUser } = req.user;
    res.json(safeUser);
  });

}
