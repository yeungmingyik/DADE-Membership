import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSqliteVersion, databasePath, getSchemaVersion, migrateDatabase, openDatabase } from "../src/server/database";
import { boundedLimit, readActivityPageFromDatabase, readAdminDashboardFromDatabase, readMemberDashboardFromDatabase, readStaffDashboardFromDatabase } from "../src/server/repository";
import { createSession, findSession, revokeSession, revokeUserSessions, sessionDigest } from "../src/server/session-store";
import { cookieName, getSurface } from "../src/server/surface";
import { createTestFixture } from "./fixtures";

let directory: string;
let fixture: ReturnType<typeof createTestFixture>;
let database: DatabaseSync;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "dade-membership-tests-"));
  fixture = createTestFixture(join(directory, "fixture.sqlite"));
  database = fixture.database;
});

afterEach(() => {
  database.close();
  rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("database foundation", () => {
  it("preserves relative and absolute runtime database configuration", () => {
    vi.stubEnv("DATABASE_PATH", undefined);
    expect(databasePath()).toBe(normalize(".local/dade.sqlite"));
    vi.stubEnv("DATABASE_PATH", "runtime/../data/membership.sqlite");
    expect(resolve(databasePath())).toBe(resolve("data/membership.sqlite"));
    const absolutePath = join(directory, "configured.sqlite");
    vi.stubEnv("DATABASE_PATH", ` ${absolutePath} `);
    expect(databasePath()).toBe(absolutePath);
    const configured = openDatabase(databasePath());
    try {
      migrateDatabase(configured);
      expect(getSchemaVersion(configured)).toBe(3);
    } finally {
      configured.close();
    }
  });

  it.each(["", "   ", ":memory:", "\\\\server\\data\\member.sqlite", "//server/data/member.sqlite"])("rejects unsafe database configuration %j", (path) => {
    vi.stubEnv("DATABASE_PATH", path);
    expect(() => databasePath()).toThrow("DATABASE_PATH_INVALID");
  });

  it("creates an empty schema explicitly and migrates idempotently", () => {
    const empty = openDatabase(join(directory, "empty.sqlite"));
    try {
      expect(getSchemaVersion(empty)).toBe(0);
      migrateDatabase(empty);
      migrateDatabase(empty);
      expect(getSchemaVersion(empty)).toBe(3);
      expect(empty.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 0 });
      expect(empty.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(empty.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
      expect(empty.prepare("PRAGMA synchronous").get()).toEqual({ synchronous: 2 });
    } finally {
      empty.close();
    }
  });

  it("requires a patched SQLite runtime", () => {
    expect(() => assertSqliteVersion("3.51.2")).toThrow("SQLITE_VERSION_UNSUPPORTED");
    expect(() => assertSqliteVersion("3.51.3")).not.toThrow();
    expect(() => assertSqliteVersion("3.53.3")).not.toThrow();
    expect(() => assertSqliteVersion("invalid")).toThrow("SQLITE_VERSION_INVALID");
  });

  it("rejects newer database schemas without resetting data", () => {
    database.exec("PRAGMA user_version = 4");
    expect(() => migrateDatabase(database)).toThrow("DATABASE_SCHEMA_NEWER");
    expect(database.prepare("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 6 });
  });

  it("enforces unique phones, integer money, foreign keys and nonnegative stock", () => {
    expect(() => database.prepare("UPDATE members SET phone_e164 = ? WHERE id = ?").run("+6581234567", "member-2")).toThrow();
    expect(() => database.prepare("UPDATE activities SET amount_cents = ? WHERE id = ?").run(1.2, "activity-1")).toThrow();
    expect(() => database.prepare("UPDATE staff SET store_id = ? WHERE id = ?").run("missing-store", fixture.ids.staff)).toThrow();
    expect(() => database.exec("UPDATE reward_stock SET quantity = -1")).toThrow();
  });

  it("upgrades v2 member ordering without changing stored identities or totals", () => {
    database.exec("DROP INDEX members_status_created; PRAGMA user_version = 2");
    migrateDatabase(database);
    migrateDatabase(database);
    expect(getSchemaVersion(database)).toBe(3);
    expect(database.prepare("PRAGMA index_info(members_status_created)").all().map((row) => row.name)).toEqual(["status", "created_at", "id"]);
    expect(database.prepare("SELECT COUNT(*) AS count FROM members").get()).toEqual({ count: 3 });
    expect(readAdminDashboardFromDatabase(database, fixture.sessions.admin.session).metrics).toEqual({ memberCount: 3, purchaseCents: 25300, pointsIssued: 4, redemptionCount: 1 });
  });

  it("refuses fixture paths outside disposable roots and existing files", () => {
    expect(() => createTestFixture(join(process.cwd(), "production.sqlite"))).toThrow("TEST_DATABASE_PATH_UNSAFE");
    expect(() => createTestFixture(fixture.databasePath)).toThrow("TEST_DATABASE_PATH_UNSAFE");
  });
});

describe("derived activity totals", () => {
  function readTotals() {
    return database.prepare("SELECT purchase_cents, points_issued, redemption_count FROM activity_totals WHERE id = 1").get();
  }

  it("backfills an existing v1 database once without altering activity", () => {
    database.exec(`
      DROP TRIGGER activity_totals_insert;
      DROP TRIGGER activity_totals_update;
      DROP TRIGGER activity_totals_delete;
      DROP TABLE activity_totals;
      DROP INDEX members_status_created;
      PRAGMA user_version = 1;
    `);
    migrateDatabase(database);
    migrateDatabase(database);
    expect(getSchemaVersion(database)).toBe(3);
    expect(readTotals()).toEqual({ purchase_cents: 25300, points_issued: 4, redemption_count: 1 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM activities").get()).toEqual({ count: 5 });
  });

  it("updates gross recorded purchases and issued points without counting negative refunds", () => {
    const insert = database.prepare(`
      INSERT INTO activities (id, member_id, store_id, kind, occurred_at, amount_cents, points_delta, status)
      VALUES (?, 'member-1', 'store-1', ?, '2026-09-24T04:00:00.000Z', ?, ?, ?)
    `);
    insert.run("refund-1", "refund", 1200, -1, "recorded");
    insert.run("refund-positive", "refund", 800, 2, "recorded");
    insert.run("collection-positive", "collection", null, 3, "fulfilled");
    expect(readTotals()).toEqual({ purchase_cents: 25300, points_issued: 4, redemption_count: 1 });
    insert.run("purchase-6", "purchase", 3100, 2, "recorded");
    expect(readTotals()).toEqual({ purchase_cents: 28400, points_issued: 6, redemption_count: 1 });
    database.prepare("UPDATE activities SET amount_cents = 4200, points_delta = 3 WHERE id = ?").run("purchase-6");
    expect(readTotals()).toEqual({ purchase_cents: 29500, points_issued: 7, redemption_count: 1 });
    database.prepare("DELETE FROM activities WHERE id = ?").run("purchase-6");
    expect(readTotals()).toEqual({ purchase_cents: 25300, points_issued: 4, redemption_count: 1 });
  });

  it("handles fulfilment and cancellation transitions exactly once", () => {
    database.prepare("UPDATE activities SET status = 'fulfilled' WHERE id = ?").run("activity-2");
    database.prepare("UPDATE activities SET status = 'fulfilled' WHERE id = ?").run("activity-2");
    expect(readTotals()).toEqual({ purchase_cents: 25300, points_issued: 4, redemption_count: 1 });
    database.prepare("UPDATE activities SET status = 'cancelled' WHERE id = ?").run("activity-2");
    expect(readTotals()).toEqual({ purchase_cents: 25300, points_issued: 4, redemption_count: 0 });
    database.prepare("UPDATE activities SET status = 'cancelled' WHERE id = ?").run("activity-1");
    expect(readTotals()).toEqual({ purchase_cents: 20500, points_issued: 3, redemption_count: 0 });
    database.prepare("DELETE FROM activities WHERE id = ?").run("activity-2");
    expect(readTotals()).toEqual({ purchase_cents: 20500, points_issued: 3, redemption_count: 0 });
  });

  it("recomputes contributions on kind changes and rolls totals back with activity", () => {
    database.prepare("UPDATE activities SET kind = 'refund', points_delta = -1 WHERE id = ?").run("activity-1");
    expect(readTotals()).toEqual({ purchase_cents: 20500, points_issued: 3, redemption_count: 1 });
    database.exec("BEGIN IMMEDIATE");
    database.prepare("DELETE FROM activities WHERE id = ?").run("activity-3");
    expect(readTotals()).toEqual({ purchase_cents: 13700, points_issued: 2, redemption_count: 1 });
    database.exec("ROLLBACK");
    expect(readTotals()).toEqual({ purchase_cents: 20500, points_issued: 3, redemption_count: 1 });
  });

  it("reads dashboard totals through a primary-key projection lookup", () => {
    const prepare = vi.spyOn(database, "prepare");
    readAdminDashboardFromDatabase(database, fixture.sessions.admin.session);
    const queries = prepare.mock.calls.map(([sql]) => sql);
    expect(queries.some((sql) => /FROM activity_totals WHERE id = 1/.test(sql))).toBe(true);
    expect(queries.some((sql) => /SUM\(/i.test(sql))).toBe(false);
    const queryPlan = database.prepare("EXPLAIN QUERY PLAN SELECT purchase_cents, points_issued, redemption_count FROM activity_totals WHERE id = 1").all();
    expect(queryPlan.some((row) => String(row.detail).includes("USING INTEGER PRIMARY KEY"))).toBe(true);
    prepare.mockRestore();
  });
});

describe("surface and session boundaries", () => {
  it("defaults only an absent surface to member", () => {
    vi.stubEnv("APP_SURFACE", undefined);
    expect(getSurface()).toBe("member");
    for (const value of ["", "administrator", "MEMBER", " staff"]) {
      vi.stubEnv("APP_SURFACE", value);
      expect(() => getSurface()).toThrow("APP_SURFACE_INVALID");
    }
    for (const surface of ["member", "staff", "admin"] as const) {
      vi.stubEnv("APP_SURFACE", surface);
      expect(getSurface()).toBe(surface);
      expect(cookieName(surface)).toBe(`dade_${surface}_session`);
    }
  });

  it("stores a token digest and rejects wrong-surface and malformed cookies", () => {
    const { token, session } = fixture.sessions.member;
    const stored = database.prepare("SELECT token_digest FROM sessions WHERE id = ?").get(session.id);
    expect(stored).toEqual({ token_digest: sessionDigest(token) });
    expect(findSession(database, token, "member")).toEqual(session);
    expect(findSession(database, token, "staff")).toBeNull();
    expect(findSession(database, "not-a-session", "member")).toBeNull();
    expect(() => createSession(database, fixture.ids.member, "admin")).toThrow("SESSION_IDENTITY_FORBIDDEN");
  });

  it("expires and revokes sessions immediately", () => {
    const now = Date.now();
    const short = createSession(database, fixture.ids.member, "member", { now, lifetimeSeconds: 1 });
    expect(findSession(database, short.token, "member", now + 999)).not.toBeNull();
    expect(findSession(database, short.token, "member", now + 1000)).toBeNull();
    revokeSession(database, fixture.sessions.member.session.id);
    expect(findSession(database, fixture.sessions.member.token, "member")).toBeNull();
    revokeUserSessions(database, fixture.ids.staff);
    expect(findSession(database, fixture.sessions.staff.token, "staff")).toBeNull();
  });

  it.each(["users", "members"])("rejects members after %s deactivation", (table) => {
    database.prepare(`UPDATE ${table} SET status = 'inactive' WHERE id = ?`).run(fixture.ids.member);
    expect(findSession(database, fixture.sessions.member.token, "member")).toBeNull();
  });

  it.each(["users", "staff", "stores"])("rejects staff after %s deactivation", (table) => {
    database.prepare(`UPDATE ${table} SET status = 'inactive' WHERE id = ?`).run(table === "stores" ? fixture.ids.store : fixture.ids.staff);
    expect(findSession(database, fixture.sessions.staff.token, "staff")).toBeNull();
  });

  it("rejects a role change and invalid lifetimes", () => {
    database.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(fixture.ids.member);
    expect(findSession(database, fixture.sessions.member.token, "member")).toBeNull();
    expect(() => createSession(database, fixture.ids.staff, "staff", { lifetimeSeconds: 0 })).toThrow("SESSION_LIFETIME_INVALID");
  });
});

describe("scoped dashboard reads", () => {
  it("returns recursively plain dashboard DTOs across the server-client boundary", () => {
    function assertPlainDto(value: unknown, path: string) {
      if (value === null || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => assertPlainDto(item, `${path}[${index}]`));
        return;
      }
      expect(Object.getPrototypeOf(value), path).toBe(Object.prototype);
      for (const [key, nested] of Object.entries(value)) {
        assertPlainDto(nested, `${path}.${key}`);
      }
    }

    const dashboards = {
      member: readMemberDashboardFromDatabase(database, fixture.sessions.member.session, fixture.ids.member),
      staff: readStaffDashboardFromDatabase(database, fixture.sessions.staff.session, fixture.ids.store),
      admin: readAdminDashboardFromDatabase(database, fixture.sessions.admin.session),
    };
    assertPlainDto(dashboards, "dashboards");
    expect(JSON.parse(JSON.stringify(dashboards))).toEqual(dashboards);
  });

  it("returns only the member's own activity and card", () => {
    const result = readMemberDashboardFromDatabase(database, fixture.sessions.member.session, fixture.ids.member);
    expect(result.member.id).toBe(fixture.ids.member);
    expect(result.member.phone).toBe("+6581234567");
    expect(result.member.qrToken).toBeTruthy();
    expect(result.activities.map((activity) => activity.id)).toEqual(["activity-1", "activity-2", "activity-3"]);
    expect(() => readMemberDashboardFromDatabase(database, fixture.sessions.member.session, fixture.ids.otherMember)).toThrow("MEMBER_FORBIDDEN");
    expect(() => readMemberDashboardFromDatabase(database, fixture.sessions.admin.session, fixture.ids.member)).toThrow("SESSION_FORBIDDEN");
  });

  it("restricts staff lists and activity to their active store", () => {
    const result = readStaffDashboardFromDatabase(database, fixture.sessions.staff.session, fixture.ids.store);
    expect(result.store.id).toBe(fixture.ids.store);
    expect(result.members.map((member) => member.id)).toEqual(["member-2", "member-1"]);
    expect(result.members.every((member) => !member.qrToken && member.phone.startsWith("••••"))).toBe(true);
    expect(result.activities.map((activity) => activity.id)).not.toContain("activity-5");
    expect(() => readStaffDashboardFromDatabase(database, fixture.sessions.staff.session, fixture.ids.otherStore)).toThrow("STORE_FORBIDDEN");
  });

  it("revalidates a previously obtained session before repository access", () => {
    revokeSession(database, fixture.sessions.admin.session.id);
    expect(() => readAdminDashboardFromDatabase(database, fixture.sessions.admin.session)).toThrow("SESSION_FORBIDDEN");
    database.prepare("UPDATE staff SET store_id = ? WHERE id = ?").run(fixture.ids.otherStore, fixture.ids.staff);
    expect(() => readStaffDashboardFromDatabase(database, fixture.sessions.staff.session, fixture.ids.store)).toThrow("SESSION_FORBIDDEN");
  });

  it("aggregates recorded activity and omits private card tokens from administration", () => {
    const result = readAdminDashboardFromDatabase(database, fixture.sessions.admin.session);
    expect(result.metrics).toEqual({ memberCount: 3, purchaseCents: 25300, pointsIssued: 4, redemptionCount: 1 });
    expect(result.members.every((member) => member.qrToken === null && !member.phone.startsWith("+"))).toBe(true);
    expect(result.stores.map((store) => store.memberCount)).toEqual([2, 1]);
    expect(() => readAdminDashboardFromDatabase(database, fixture.sessions.staff.session)).toThrow("SESSION_FORBIDDEN");
  });

  it("paginates tied timestamps deterministically without overlaps", () => {
    database.exec("UPDATE activities SET occurred_at = '2026-09-24T03:25:00.000Z'");
    const first = readActivityPageFromDatabase(database, fixture.sessions.admin.session, { limit: 2 });
    const second = readActivityPageFromDatabase(database, fixture.sessions.admin.session, { limit: 2, cursor: first.nextCursor! });
    const third = readActivityPageFromDatabase(database, fixture.sessions.admin.session, { limit: 2, cursor: second.nextCursor! });
    expect([...first.items, ...second.items, ...third.items].map((activity) => activity.id)).toEqual(["activity-5", "activity-4", "activity-3", "activity-2", "activity-1"]);
    expect(third.nextCursor).toBeNull();
    expect(() => readActivityPageFromDatabase(database, fixture.sessions.admin.session, { cursor: { id: "x", occurredAt: "2026-invalid" } })).toThrow("QUERY_CURSOR_INVALID");
  });

  it("bounds row limits and excludes stock in inactive stores", () => {
    expect(boundedLimit(100)).toBe(100);
    for (const value of [0, -1, 101, 1.5, NaN]) {
      expect(() => boundedLimit(value)).toThrow("QUERY_LIMIT_INVALID");
    }
    database.prepare("UPDATE stores SET status = 'inactive' WHERE id = ?").run(fixture.ids.store);
    const result = readMemberDashboardFromDatabase(database, fixture.sessions.member.session, fixture.ids.member);
    expect(result.rewards.every((reward) => reward.stock === 0)).toBe(true);
  });
});
