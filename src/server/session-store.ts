import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Session, Surface } from "../lib/contracts";

type IdentityRow = {
  user_id: string;
  display_name: string;
  role: Surface;
  store_id: string | null;
};

const identitySql = `
  SELECT u.id AS user_id, u.display_name, u.role, st.store_id
  FROM users u
  LEFT JOIN members m ON m.id = u.id
  LEFT JOIN staff st ON st.id = u.id
  LEFT JOIN stores s ON s.id = st.store_id
  WHERE u.id = ? AND u.role = ? AND u.status = 'active'
    AND (
      (u.role = 'member' AND m.status = 'active')
      OR (u.role = 'staff' AND st.status = 'active' AND s.status = 'active')
      OR u.role = 'admin'
    )
`;

export function isSessionToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function sessionDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function identity(database: DatabaseSync, userId: string, surface: Surface) {
  return database.prepare(identitySql).get(userId, surface) as IdentityRow | undefined;
}

function toSession(id: string, row: IdentityRow): Session {
  return {
    id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    storeId: row.role === "staff" ? row.store_id : null,
  };
}

export function createSession(
  database: DatabaseSync,
  userId: string,
  surface: Surface,
  options: { lifetimeSeconds?: number; now?: number } = {},
) {
  const now = options.now ?? Date.now();
  const lifetimeSeconds = options.lifetimeSeconds ?? (surface === "member" ? 604800 : 28800);

  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(lifetimeSeconds) ||
    lifetimeSeconds < 1 ||
    lifetimeSeconds > 2592000
  ) {
    throw new Error("SESSION_LIFETIME_INVALID");
  }

  const row = identity(database, userId, surface);
  if (!row) throw new Error("SESSION_IDENTITY_FORBIDDEN");

  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  const expiresAt = now + lifetimeSeconds * 1000;
  if (!Number.isSafeInteger(expiresAt)) throw new Error("SESSION_LIFETIME_INVALID");

  database
    .prepare(
      `INSERT INTO sessions (id, user_id, surface, token_digest, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, surface, sessionDigest(token), now, expiresAt);

  return { token, session: toSession(id, row), expiresAt };
}

export function findSession(
  database: DatabaseSync,
  token: string,
  surface: Surface,
  now = Date.now(),
): Session | null {
  if (!isSessionToken(token)) return null;

  const row = database
    .prepare(
      `SELECT id, user_id FROM sessions
       WHERE token_digest = ? AND surface = ? AND expires_at > ?
         AND created_at <= ? AND revoked_at IS NULL`,
    )
    .get(sessionDigest(token), surface, now, now) as
    | { id: string; user_id: string }
    | undefined;

  if (!row) return null;
  const user = identity(database, row.user_id, surface);
  return user ? toSession(row.id, user) : null;
}

export function revokeSession(database: DatabaseSync, id: string, now = Date.now()) {
  database.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(now, id);
}

export function revokeUserSessions(database: DatabaseSync, userId: string, now = Date.now()) {
  database
    .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(now, userId);
}

export function assertSession(
  database: DatabaseSync,
  session: Session,
  surface: Surface,
  now = Date.now(),
) {
  if (session.role !== surface) throw new Error("SESSION_FORBIDDEN");

  const active = database
    .prepare(
      `SELECT id FROM sessions WHERE id = ? AND user_id = ? AND surface = ?
       AND expires_at > ? AND created_at <= ? AND revoked_at IS NULL`,
    )
    .get(session.id, session.userId, surface, now, now);
  const user = identity(database, session.userId, surface);

  if (!active || !user || (surface === "staff" && user.store_id !== session.storeId)) {
    throw new Error("SESSION_FORBIDDEN");
  }
}
