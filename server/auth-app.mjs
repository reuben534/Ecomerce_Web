import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomInt, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

const SESSION_COOKIE = 'smartshop_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validPassword(value) {
  return typeof value === 'string'
    && value.length >= 12
    && value.length <= 128
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? entry.trim().slice(name.length + 1) : '';
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    emailVerified: Boolean(user.email_verified_at),
  };
}

export function createAuthApp({ databasePath = 'server/data/auth.sqlite', production = process.env.NODE_ENV === 'production' } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
  `);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', production ? 1 : false);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  function strictRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 8,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  function issueToken(userId, purpose, value) {
    const now = Date.now();
    database.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?').run(userId, purpose);
    database.prepare(`
      INSERT INTO auth_tokens (token_hash, user_id, purpose, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(digest(value), userId, purpose, now + TOKEN_LIFETIME_MS, now);
  }

  function createSession(response, userId) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .run(digest(token), userId, now + SESSION_LIFETIME_MS, now);
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_LIFETIME_MS,
    });
  }

  function currentUser(request) {
    const token = readCookie(request, SESSION_COOKIE);
    if (!token) return null;
    const now = Date.now();
    const session = database.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(digest(token));
    if (!session) return null;
    if (session.expires_at <= now) {
      database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
      return null;
    }
    return database.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) ?? null;
  }

  function requireUser(request, response, next) {
    const user = currentUser(request);
    if (!user) return response.status(401).json({ error: 'Please sign in to continue.' });
    request.user = user;
    next();
  }

  function validatePasswordOrRespond(password, response) {
    if (validPassword(password)) return true;
    response.status(400).json({
      error: 'Use 12–128 characters with at least one uppercase letter, lowercase letter, number, and symbol.',
      code: 'WEAK_PASSWORD',
    });
    return false;
  }

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

  app.get('/api/auth/me', (request, response) => {
    const user = currentUser(request);
    response.json({ user: user ? publicUser(user) : null });
  });

  app.post('/api/auth/register', strictRateLimit(), async (request, response, next) => {
    try {
      if (production) {
        return response.status(503).json({ error: 'Email delivery must be configured before production registration is enabled.' });
      }
      const firstName = typeof request.body.firstName === 'string' ? request.body.firstName.trim() : '';
      const lastName = typeof request.body.lastName === 'string' ? request.body.lastName.trim() : '';
      const email = normalizeEmail(request.body.email);
      const phone = typeof request.body.phone === 'string' ? request.body.phone.trim() : '';
      const password = request.body.password;

      if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !validEmail(email) || !phone || phone.length > 40) {
        return response.status(400).json({ error: 'Enter a valid name, email address, and phone number.' });
      }
      if (!validatePasswordOrRespond(password, response)) return;
      if (database.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
        return response.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
      const now = Date.now();
      const result = database.prepare(`
        INSERT INTO users (first_name, last_name, email, phone, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(firstName, lastName, email, phone, passwordHash, now);
      const userId = Number(result.lastInsertRowid);
      const verificationToken = randomBytes(32).toString('base64url');
      issueToken(userId, 'verify_email', verificationToken);

      response.status(201).json({
        message: 'Registration successful. Please verify your email address.',
        devVerificationToken: verificationToken,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/verify-email', strictRateLimit(), (request, response) => {
    const token = typeof request.body.token === 'string' ? request.body.token : '';
    if (!token || token.length > 128) return response.status(400).json({ error: 'Verification link is invalid or expired.' });
    const record = database.prepare(`
      SELECT user_id, expires_at FROM auth_tokens
      WHERE token_hash = ? AND purpose = 'verify_email'
    `).get(digest(token));
    if (!record || record.expires_at <= Date.now()) {
      return response.status(400).json({ error: 'Verification link is invalid or expired.' });
    }
    database.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').run(Date.now(), record.user_id);
    database.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').run(digest(token));
    response.json({ message: 'Email verified successfully.' });
  });

  app.post('/api/auth/resend-verification', strictRateLimit(), (request, response) => {
    if (production) return response.status(503).json({ error: 'Email delivery is not configured.' });
    const email = normalizeEmail(request.body.email);
    const user = database.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').get(email);
    const result = { message: 'If that account needs verification, a new link has been sent.' };
    if (user && !user.email_verified_at) {
      const token = randomBytes(32).toString('base64url');
      issueToken(user.id, 'verify_email', token);
      result.devVerificationToken = token;
    }
    response.json(result);
  });

  app.post('/api/auth/login', strictRateLimit(), async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      const password = typeof request.body.password === 'string' ? request.body.password : '';
      const user = validEmail(email) ? database.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return response.status(401).json({ error: 'Email or password is incorrect.' });
      }
      if (!user.email_verified_at) {
        return response.status(403).json({ error: 'Please verify your email address before signing in.', code: 'EMAIL_NOT_VERIFIED' });
      }
      createSession(response, user.id);
      response.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/logout', (request, response) => {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  });

  app.post('/api/auth/forgot-password', strictRateLimit(), (request, response) => {
    if (production) return response.status(503).json({ error: 'Email delivery is not configured.' });
    const email = normalizeEmail(request.body.email);
    const user = validEmail(email) ? database.prepare('SELECT id FROM users WHERE email = ?').get(email) : null;
    const result = { message: 'If an account exists for this email, a reset code has been sent.' };
    if (user) {
      const code = String(randomInt(100000, 1000000));
      issueToken(user.id, 'reset_password', code);
      result.devResetCode = code;
    }
    response.json(result);
  });

  app.post('/api/auth/reset-password', strictRateLimit(), async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      const code = typeof request.body.code === 'string' ? request.body.code.trim() : '';
      if (!validatePasswordOrRespond(request.body.password, response)) return;
      const user = validEmail(email) ? database.prepare('SELECT id FROM users WHERE email = ?').get(email) : null;
      const record = user ? database.prepare(`
        SELECT token_hash, expires_at FROM auth_tokens
        WHERE user_id = ? AND purpose = 'reset_password'
      `).get(user.id) : null;
      if (!record || record.expires_at <= Date.now() || digest(code) !== record.token_hash) {
        return response.status(400).json({ error: 'Reset code is invalid or expired.' });
      }

      const passwordHash = await bcrypt.hash(request.body.password, PASSWORD_HASH_ROUNDS);
      database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      database.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?').run(user.id, 'reset_password');
      database.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      response.json({ message: 'Password reset successfully. Please sign in with your new password.' });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    if (error?.type === 'entity.parse.failed') return response.status(400).json({ error: 'Request body must be valid JSON.' });
    console.error('Auth request failed:', error.message);
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return { app, database };
}