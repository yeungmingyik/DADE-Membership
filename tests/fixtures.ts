import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { migrateDatabase, openDatabase } from "../src/server/database";
import { createSession } from "../src/server/session-store";

function isWithin(root: string, target: string) {
  const path = relative(resolve(root), target);
  return path !== "" && !path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path);
}

export function createTestFixture(path: string) {
  const databasePath = resolve(path);
  const localVerification =
    isWithin(resolve(process.cwd(), ".local"), databasePath) &&
    basename(databasePath).startsWith("verification-");

  if (
    (!isWithin(tmpdir(), databasePath) && !localVerification) ||
    !databasePath.endsWith(".sqlite") ||
    existsSync(databasePath) ||
    (process.env.DATABASE_PATH && resolve(process.env.DATABASE_PATH) === databasePath)
  ) {
    throw new Error("TEST_DATABASE_PATH_UNSAFE");
  }

  const database = openDatabase(databasePath);

  try {
    migrateDatabase(database);
    database.exec("BEGIN IMMEDIATE");

    const createdAt = "2026-09-01T02:00:00.000Z";
    const users = [
      ["member-1", "member", "Jamie Tan"],
      ["member-2", "member", "Riley Chen"],
      ["member-3", "member", "Alex Wong"],
      ["staff-1", "staff", "Morgan Lee"],
      ["staff-2", "staff", "Casey Lim"],
      ["admin-1", "admin", "Jordan Tan"],
    ];
    const insertUser = database.prepare(
      "INSERT INTO users (id, role, display_name, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const [id, role, name] of users) insertUser.run(id, role, name, createdAt);

    database.prepare("INSERT INTO stores (id, name_en, name_zh_cn) VALUES (?, ?, ?)").run(
      "store-1", "DADE Orchard", "DADE 乌节店",
    );
    database.prepare("INSERT INTO stores (id, name_en, name_zh_cn) VALUES (?, ?, ?)").run(
      "store-2", "DADE Marina", "DADE 滨海店",
    );
    const insertMember = database.prepare(
      `INSERT INTO members
       (id, number, phone_e164, tier, points, visits, next_tier_visits, qr_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertMember.run("member-1", "DADE-000001", "+6581234567", "silver", 28, 6, 8, "test_member_card_001", createdAt);
    insertMember.run("member-2", "DADE-000002", "+447911123456", "bronze", 6, 2, 4, "test_member_card_002", createdAt);
    insertMember.run("member-3", "DADE-000003", "+12025550123", "gold", 52, 9, null, "test_member_card_003", createdAt);
    const memberStore = database.prepare("INSERT INTO member_stores (member_id, store_id) VALUES (?, ?)");
    memberStore.run("member-1", "store-1");
    memberStore.run("member-2", "store-1");
    memberStore.run("member-3", "store-2");
    const insertStaff = database.prepare("INSERT INTO staff (id, store_id, position) VALUES (?, ?, ?)");
    insertStaff.run("staff-1", "store-1", "supervisor");
    insertStaff.run("staff-2", "store-2", "staff");
    const insertActivity = database.prepare(
      `INSERT INTO activities
       (id, member_id, store_id, kind, occurred_at, amount_cents, points_delta, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertActivity.run("activity-1", "member-1", "store-1", "purchase", "2026-09-24T03:25:00.000Z", 4800, 1, "recorded");
    insertActivity.run("activity-2", "member-1", "store-1", "redemption", "2026-09-22T07:30:00.000Z", null, -10, "confirmed");
    insertActivity.run("activity-3", "member-1", "store-1", "purchase", "2026-09-20T04:10:00.000Z", 6800, 1, "recorded");
    insertActivity.run("activity-4", "member-2", "store-1", "purchase", "2026-09-24T02:40:00.000Z", 3200, 1, "recorded");
    insertActivity.run("activity-5", "member-3", "store-2", "purchase", "2026-09-24T01:15:00.000Z", 10500, 1, "recorded");
    const insertReward = database.prepare(
      "INSERT INTO rewards (id, name_en, name_zh_cn, points) VALUES (?, ?, ?, ?)",
    );
    insertReward.run("reward-1", "Everyday tumbler", "随行保温杯", 10);
    insertReward.run("reward-2", "Signature tote", "经典帆布袋", 20);
    insertReward.run("reward-3", "Travel umbrella", "轻便折叠伞", 25);
    const insertStock = database.prepare(
      "INSERT INTO reward_stock (reward_id, store_id, quantity) VALUES (?, ?, ?)",
    );
    insertStock.run("reward-1", "store-1", 12);
    insertStock.run("reward-2", "store-1", 8);
    insertStock.run("reward-3", "store-1", 0);
    database.exec("COMMIT");

    return {
      database,
      databasePath,
      sessions: {
        member: createSession(database, "member-1", "member"),
        staff: createSession(database, "staff-1", "staff"),
        admin: createSession(database, "admin-1", "admin"),
      },
      ids: {
        member: "member-1",
        otherMember: "member-3",
        staff: "staff-1",
        otherStaff: "staff-2",
        admin: "admin-1",
        store: "store-1",
        otherStore: "store-2",
      },
    };
  } catch (error) {
    database.close();
    throw error;
  }
}
