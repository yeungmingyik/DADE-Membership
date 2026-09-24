import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  Activity,
  AdminDashboard,
  MemberDashboard,
  MemberSummary,
  Reward,
  Session,
  StaffDashboard,
} from "../lib/contracts";
import { assertSession } from "./session-store";

type MemberRow = {
  id: string;
  number: string;
  name: string;
  phone: string;
  tier: MemberSummary["tier"];
  points: number;
  visits: number;
  nextTierVisits: number | null;
  qrToken: string | null;
};

type ActivityRow = Omit<Activity, "storeName"> & { name_en: string; name_zh_cn: string };

export type ActivityCursor = { occurredAt: string; id: string };
export type ActivityPage = { items: Activity[]; nextCursor: ActivityCursor | null };

export function boundedLimit(limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("QUERY_LIMIT_INVALID");
  }
  return limit;
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    kind: row.kind,
    storeName: { en: row.name_en, "zh-CN": row.name_zh_cn },
    occurredAt: row.occurredAt,
    amountCents: row.amountCents,
    pointsDelta: row.pointsDelta,
    status: row.status,
  };
}

function maskPhone(phone: string) {
  return `•••• ${phone.slice(-4)}`;
}

function toMember(row: MemberRow, includePrivate: boolean): MemberSummary {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    phone: includePrivate ? row.phone : maskPhone(row.phone),
    tier: row.tier,
    points: row.points,
    visits: row.visits,
    nextTierVisits: row.nextTierVisits,
    qrToken: includePrivate ? row.qrToken : null,
  };
}

function memberColumns(includeQr: boolean) {
  return `m.id, m.number, u.display_name AS name, m.phone_e164 AS phone,
    m.tier, m.points, m.visits, m.next_tier_visits AS nextTierVisits,
    ${includeQr ? "m.qr_token" : "NULL"} AS qrToken`;
}

export function readActivityPageFromDatabase(
  database: DatabaseSync,
  session: Session,
  options: { limit?: number; cursor?: ActivityCursor } = {},
): ActivityPage {
  assertSession(database, session, session.role);
  const limit = boundedLimit(options.limit);
  const parameters: SQLInputValue[] = [];
  const conditions: string[] = [];

  if (session.role === "member") {
    conditions.push("a.member_id = ?");
    parameters.push(session.userId);
  } else if (session.role === "staff") {
    conditions.push("a.store_id = ?");
    parameters.push(session.storeId);
  }

  if (options.cursor) {
    if (
      options.cursor.id.length > 128 ||
      !options.cursor.id ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(options.cursor.occurredAt) ||
      !Number.isFinite(Date.parse(options.cursor.occurredAt))
    ) {
      throw new Error("QUERY_CURSOR_INVALID");
    }
    conditions.push("(a.occurred_at < ? OR (a.occurred_at = ? AND a.id < ?))");
    parameters.push(options.cursor.occurredAt, options.cursor.occurredAt, options.cursor.id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = database
    .prepare(
      `SELECT a.id, a.kind, s.name_en, s.name_zh_cn,
        a.occurred_at AS occurredAt, a.amount_cents AS amountCents,
        a.points_delta AS pointsDelta, a.status
       FROM activities a JOIN stores s ON s.id = a.store_id
       ${where} ORDER BY a.occurred_at DESC, a.id DESC LIMIT ?`,
    )
    .all(...parameters, limit + 1) as ActivityRow[];
  const items = rows.slice(0, limit).map(toActivity);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      rows.length > limit && last ? { occurredAt: last.occurredAt, id: last.id } : null,
  };
}

export function readMemberDashboardFromDatabase(
  database: DatabaseSync,
  session: Session,
  memberId: string,
): MemberDashboard {
  assertSession(database, session, "member");
  if (memberId !== session.userId) throw new Error("MEMBER_FORBIDDEN");

  const member = database
    .prepare(
      `SELECT ${memberColumns(true)} FROM members m JOIN users u ON u.id = m.id
       WHERE m.id = ? AND m.status = 'active' AND u.status = 'active'`,
    )
    .get(memberId) as MemberRow | undefined;
  if (!member) throw new Error("MEMBER_NOT_FOUND");

  const rewardRows = database
    .prepare(
      `SELECT r.id, r.name_en, r.name_zh_cn, r.points, r.image,
        COALESCE(SUM(CASE WHEN s.status = 'active' THEN rs.quantity ELSE 0 END), 0) AS stock
       FROM rewards r
       LEFT JOIN reward_stock rs ON rs.reward_id = r.id
       LEFT JOIN stores s ON s.id = rs.store_id
       WHERE r.status = 'active'
       GROUP BY r.id ORDER BY r.points, r.id LIMIT 24`,
    )
    .all() as { id: string; name_en: string; name_zh_cn: string; points: number; image: string | null; stock: number }[];
  const rewards: Reward[] = rewardRows.map((row) => ({
    id: row.id,
    name: { en: row.name_en, "zh-CN": row.name_zh_cn },
    points: row.points,
    image: row.image,
    stock: row.stock,
  }));

  return {
    member: toMember(member, true),
    activities: readActivityPageFromDatabase(database, session, { limit: 10 }).items,
    rewards,
  };
}

export function readStaffDashboardFromDatabase(
  database: DatabaseSync,
  session: Session,
  storeId: string,
): StaffDashboard {
  assertSession(database, session, "staff");
  if (storeId !== session.storeId) throw new Error("STORE_FORBIDDEN");

  const storeRow = database
    .prepare("SELECT id, name_en, name_zh_cn FROM stores WHERE id = ? AND status = 'active'")
    .get(storeId) as { id: string; name_en: string; name_zh_cn: string } | undefined;
  if (!storeRow) throw new Error("STORE_NOT_FOUND");

  const members = database
    .prepare(
      `SELECT ${memberColumns(false)} FROM member_stores ms
       JOIN members m ON m.id = ms.member_id JOIN users u ON u.id = m.id
       WHERE ms.store_id = ? AND m.status = 'active' AND u.status = 'active'
       ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
    )
    .all(storeId) as MemberRow[];

  return {
    store: { id: storeRow.id, name: { en: storeRow.name_en, "zh-CN": storeRow.name_zh_cn } },
    members: members.map((member) => toMember(member, false)),
    activities: readActivityPageFromDatabase(database, session, { limit: 20 }).items,
  };
}

export function readAdminDashboardFromDatabase(
  database: DatabaseSync,
  session: Session,
): AdminDashboard {
  assertSession(database, session, "admin");

  const members = database
    .prepare(
      `SELECT ${memberColumns(false)} FROM members m JOIN users u ON u.id = m.id
       WHERE m.status = 'active' AND u.status = 'active'
       ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
    )
    .all() as MemberRow[];
  const storeRows = database
    .prepare(
      `SELECT s.id, s.name_en, s.name_zh_cn, s.status,
        (SELECT COUNT(*) FROM member_stores ms
          JOIN members m ON m.id = ms.member_id JOIN users u ON u.id = m.id
          WHERE ms.store_id = s.id AND m.status = 'active' AND u.status = 'active') AS memberCount
       FROM stores s ORDER BY s.id LIMIT 100`,
    )
    .all() as { id: string; name_en: string; name_zh_cn: string; status: "active" | "inactive"; memberCount: number }[];
  const staffRows = database
    .prepare(
      `SELECT st.id, u.display_name AS name, st.position AS role, s.name_en, s.name_zh_cn,
        CASE WHEN st.status = 'active' AND u.status = 'active' THEN 'active' ELSE 'inactive' END AS status
       FROM staff st JOIN users u ON u.id = st.id JOIN stores s ON s.id = st.store_id
       ORDER BY st.id LIMIT 100`,
    )
    .all() as { id: string; name: string; role: string; name_en: string; name_zh_cn: string; status: "active" | "inactive" }[];
  const memberCount = database
    .prepare(
      "SELECT COUNT(*) AS count FROM members m JOIN users u ON u.id = m.id WHERE m.status = 'active' AND u.status = 'active'",
    )
    .get() as { count: number };
  const metrics = database
    .prepare(
      `SELECT
        purchase_cents AS purchaseCents, points_issued AS pointsIssued,
        redemption_count AS redemptionCount
       FROM activity_totals WHERE id = 1`,
    )
    .get() as Omit<AdminDashboard["metrics"], "memberCount">;

  return {
    members: members.map((member) => toMember(member, false)),
    stores: storeRows.map((row) => ({
      id: row.id,
      name: { en: row.name_en, "zh-CN": row.name_zh_cn },
      status: row.status,
      memberCount: row.memberCount,
    })),
    staff: staffRows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      storeName: { en: row.name_en, "zh-CN": row.name_zh_cn },
      status: row.status,
    })),
    activities: readActivityPageFromDatabase(database, session, { limit: 20 }).items,
    metrics: {
      memberCount: memberCount.count,
      purchaseCents: metrics.purchaseCents,
      pointsIssued: metrics.pointsIssued,
      redemptionCount: metrics.redemptionCount,
    },
  };
}
