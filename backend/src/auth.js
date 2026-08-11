// Login sessions. Signing in creates a random token that the app stores on
// the phone and sends back on every request afterward (in the
// "Authorization: Bearer <token>" header) to prove who is asking.
//
// The database never stores the token itself, only its SHA-256 fingerprint.
// That way, if the database ever leaked, nobody could use the leaked rows to
// log in as anyone, since a fingerprint cannot be turned back into the token
// it came from.

import { bytesToHex } from './utils.js';

const SESSION_LIFETIME_DAYS = 90;

export function generateToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function fingerprintToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export async function createSession(db, userId) {
  const token = generateToken();
  const fingerprint = await fingerprintToken(token);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare('INSERT INTO sessions (token_fingerprint, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(fingerprint, userId, expiresAt)
    .run();

  return token;
}

// Reads the Authorization header, checks it against the sessions table, and
// returns the logged-in user's row if everything checks out. Returns null if
// the header is missing, the token is unknown, or the session has expired,
// so callers can respond with 401 without needing to know why.
export async function getUserFromRequest(request, db) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return null;
  }
  const token = match[1];
  const fingerprint = await fingerprintToken(token);

  const session = await db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_fingerprint = ?')
    .bind(fingerprint)
    .first();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(session.user_id)
    .first();

  return user || null;
}

export async function deleteSession(request, db) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return;
  }
  const fingerprint = await fingerprintToken(match[1]);
  await db.prepare('DELETE FROM sessions WHERE token_fingerprint = ?').bind(fingerprint).run();
}
