export type Locale = "en" | "zh-CN";

export type Surface = "member" | "staff" | "admin";

export type Session = {
  id: string;
  userId: string;
  role: Surface;
  displayName: string;
  storeId: string | null;
};

export type LocalizedText = Record<Locale, string>;

export type MemberSummary = {
  id: string;
  number: string;
  name: string;
  phone: string;
  tier: "bronze" | "silver" | "gold";
  points: number;
  visits: number;
  nextTierVisits: number | null;
  qrToken: string | null;
};

export type Activity = {
  id: string;
  kind: "purchase" | "refund" | "redemption" | "collection";
  storeName: LocalizedText;
  occurredAt: string;
  amountCents: number | null;
  pointsDelta: number;
  status: "recorded" | "confirmed" | "fulfilled" | "cancelled";
};

export type Reward = {
  id: string;
  name: LocalizedText;
  points: number;
  image: string | null;
  stock: number;
};

export type MemberDashboard = {
  member: MemberSummary;
  activities: Activity[];
  rewards: Reward[];
};

export type StaffDashboard = {
  store: { id: string; name: LocalizedText };
  members: MemberSummary[];
  activities: Activity[];
};

export type AdminDashboard = {
  members: MemberSummary[];
  stores: {
    id: string;
    name: LocalizedText;
    status: "active" | "inactive";
    memberCount: number;
  }[];
  staff: {
    id: string;
    name: string;
    role: string;
    storeName: LocalizedText;
    status: "active" | "inactive";
  }[];
  activities: Activity[];
  metrics: {
    memberCount: number;
    purchaseCents: number;
    pointsIssued: number;
    redemptionCount: number;
  };
};
