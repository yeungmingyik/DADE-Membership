import { mkdirSync } from "node:fs";
import { dirname, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = 3;

let activeDatabase: DatabaseSync | undefined;
let activeDatabasePath: string | undefined;

export function databasePath() {
  const configuredPath = process.env.DATABASE_PATH?.trim();

  if (process.env.DATABASE_PATH !== undefined && !configuredPath) {
    throw new Error("DATABASE_PATH_INVALID");
  }

  const path = configuredPath ?? ".local/dade.sqlite";

  if (path === ":memory:" || /^(?:\\\\|\/\/)/.test(path)) {
    throw new Error("DATABASE_PATH_INVALID");
  }

  return normalize(path);
}

export function assertSqliteVersion(version: string) {
  const parts = version.split(".").map(Number);
  const minimum = [3, 51, 3];

  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
    throw new Error("SQLITE_VERSION_INVALID");
  }

  for (let index = 0; index < minimum.length; index += 1) {
    if (parts[index] > minimum[index]) return;
    if (parts[index] < minimum[index]) throw new Error("SQLITE_VERSION_UNSUPPORTED");
  }
}

export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);

  try {
    const row = database.prepare("SELECT sqlite_version() AS version").get() as {
      version: string;
    };
    assertSqliteVersion(row.version);
    database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 250;");
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function getSchemaVersion(database: DatabaseSync) {
  const result = database.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  return result.user_version;
}

export function migrateDatabase(database: DatabaseSync) {
  database.exec("BEGIN IMMEDIATE");

  try {
    const version = getSchemaVersion(database);
    if (version > SCHEMA_VERSION) throw new Error("DATABASE_SCHEMA_NEWER");

    if (version === 0) {
      database.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL CHECK (role IN ('member', 'staff', 'admin')),
          display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE stores (
          id TEXT PRIMARY KEY,
          name_en TEXT NOT NULL,
          name_zh_cn TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
        ) STRICT;
        CREATE TABLE members (
          id TEXT PRIMARY KEY REFERENCES users(id),
          number TEXT NOT NULL UNIQUE CHECK (number LIKE 'DADE-%'),
          phone_e164 TEXT NOT NULL UNIQUE,
          tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
          points INTEGER NOT NULL DEFAULT 0 CHECK (points BETWEEN -9007199254740991 AND 9007199254740991),
          visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
          next_tier_visits INTEGER CHECK (next_tier_visits >= 0),
          qr_token TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE member_stores (
          member_id TEXT NOT NULL REFERENCES members(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          PRIMARY KEY (store_id, member_id)
        ) STRICT;
        CREATE INDEX member_stores_member ON member_stores(member_id, store_id);
        CREATE TABLE staff (
          id TEXT PRIMARY KEY REFERENCES users(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          position TEXT NOT NULL CHECK (position IN ('staff', 'supervisor')),
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
        ) STRICT;
        CREATE INDEX staff_store ON staff(store_id, status);
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          surface TEXT NOT NULL CHECK (surface IN ('member', 'staff', 'admin')),
          token_digest TEXT NOT NULL UNIQUE CHECK (length(token_digest) = 64),
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
          revoked_at INTEGER
        ) STRICT;
        CREATE INDEX sessions_user ON sessions(user_id, surface);
        CREATE INDEX sessions_expiry ON sessions(expires_at);
        CREATE TABLE activities (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL REFERENCES members(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          kind TEXT NOT NULL CHECK (kind IN ('purchase', 'refund', 'redemption', 'collection')),
          occurred_at TEXT NOT NULL,
          amount_cents INTEGER CHECK (amount_cents BETWEEN 0 AND 9007199254740991),
          points_delta INTEGER NOT NULL CHECK (points_delta BETWEEN -9007199254740991 AND 9007199254740991),
          status TEXT NOT NULL CHECK (status IN ('recorded', 'confirmed', 'fulfilled', 'cancelled'))
        ) STRICT;
        CREATE INDEX activities_member_time ON activities(member_id, occurred_at DESC, id DESC);
        CREATE INDEX activities_store_time ON activities(store_id, occurred_at DESC, id DESC);
        CREATE INDEX activities_time ON activities(occurred_at DESC, id DESC);
        CREATE TABLE rewards (
          id TEXT PRIMARY KEY,
          name_en TEXT NOT NULL,
          name_zh_cn TEXT NOT NULL,
          points INTEGER NOT NULL CHECK (points > 0),
          image TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
        ) STRICT;
        CREATE TABLE reward_stock (
          reward_id TEXT NOT NULL REFERENCES rewards(id),
          store_id TEXT NOT NULL REFERENCES stores(id),
          quantity INTEGER NOT NULL CHECK (quantity >= 0),
          PRIMARY KEY (reward_id, store_id)
        ) STRICT;
        PRAGMA user_version = 1;
      `);
    }

    if (version < 2) {
      database.exec(`
        CREATE TABLE activity_totals (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          purchase_cents INTEGER NOT NULL CHECK (purchase_cents BETWEEN 0 AND 9007199254740991),
          points_issued INTEGER NOT NULL CHECK (points_issued BETWEEN 0 AND 9007199254740991),
          redemption_count INTEGER NOT NULL CHECK (redemption_count BETWEEN 0 AND 9007199254740991)
        ) STRICT;
        INSERT INTO activity_totals (id, purchase_cents, points_issued, redemption_count)
        SELECT 1,
          COALESCE(SUM(CASE WHEN kind = 'purchase' AND status = 'recorded' THEN amount_cents ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN kind = 'purchase' AND points_delta > 0 AND status = 'recorded' THEN points_delta ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN kind = 'redemption' AND status IN ('confirmed', 'fulfilled') THEN 1 ELSE 0 END), 0)
        FROM activities;
        CREATE TRIGGER activity_totals_insert AFTER INSERT ON activities BEGIN
          UPDATE activity_totals SET
            purchase_cents = purchase_cents + CASE WHEN NEW.kind = 'purchase' AND NEW.status = 'recorded' THEN COALESCE(NEW.amount_cents, 0) ELSE 0 END,
            points_issued = points_issued + CASE WHEN NEW.kind = 'purchase' AND NEW.points_delta > 0 AND NEW.status = 'recorded' THEN NEW.points_delta ELSE 0 END,
            redemption_count = redemption_count + CASE WHEN NEW.kind = 'redemption' AND NEW.status IN ('confirmed', 'fulfilled') THEN 1 ELSE 0 END
          WHERE id = 1;
        END;
        CREATE TRIGGER activity_totals_update AFTER UPDATE ON activities BEGIN
          UPDATE activity_totals SET
            purchase_cents = purchase_cents
              - CASE WHEN OLD.kind = 'purchase' AND OLD.status = 'recorded' THEN COALESCE(OLD.amount_cents, 0) ELSE 0 END
              + CASE WHEN NEW.kind = 'purchase' AND NEW.status = 'recorded' THEN COALESCE(NEW.amount_cents, 0) ELSE 0 END,
            points_issued = points_issued
              - CASE WHEN OLD.kind = 'purchase' AND OLD.points_delta > 0 AND OLD.status = 'recorded' THEN OLD.points_delta ELSE 0 END
              + CASE WHEN NEW.kind = 'purchase' AND NEW.points_delta > 0 AND NEW.status = 'recorded' THEN NEW.points_delta ELSE 0 END,
            redemption_count = redemption_count
              - CASE WHEN OLD.kind = 'redemption' AND OLD.status IN ('confirmed', 'fulfilled') THEN 1 ELSE 0 END
              + CASE WHEN NEW.kind = 'redemption' AND NEW.status IN ('confirmed', 'fulfilled') THEN 1 ELSE 0 END
          WHERE id = 1;
        END;
        CREATE TRIGGER activity_totals_delete AFTER DELETE ON activities BEGIN
          UPDATE activity_totals SET
            purchase_cents = purchase_cents - CASE WHEN OLD.kind = 'purchase' AND OLD.status = 'recorded' THEN COALESCE(OLD.amount_cents, 0) ELSE 0 END,
            points_issued = points_issued - CASE WHEN OLD.kind = 'purchase' AND OLD.points_delta > 0 AND OLD.status = 'recorded' THEN OLD.points_delta ELSE 0 END,
            redemption_count = redemption_count - CASE WHEN OLD.kind = 'redemption' AND OLD.status IN ('confirmed', 'fulfilled') THEN 1 ELSE 0 END
          WHERE id = 1;
        END;
        PRAGMA user_version = 2;
      `);
    }

    if (version < 3) {
      database.exec(`
        CREATE INDEX members_status_created ON members(status, created_at DESC, id DESC);
        PRAGMA user_version = 3;
      `);
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getDatabase() {
  const path = databasePath();

  if (activeDatabase && activeDatabasePath === path) return activeDatabase;
  if (activeDatabase) activeDatabase.close();

  activeDatabase = undefined;
  activeDatabasePath = undefined;
  const database = openDatabase(path);

  if (getSchemaVersion(database) !== SCHEMA_VERSION) {
    database.close();
    throw new Error("DATABASE_MIGRATION_REQUIRED");
  }

  activeDatabase = database;
  activeDatabasePath = path;
  return database;
}
