import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "./auth";
import { getDatabase } from "./database";
import {
  readAdminDashboardFromDatabase,
  readMemberDashboardFromDatabase,
  readStaffDashboardFromDatabase,
} from "./repository";

export async function readMemberDashboard(memberId: string) {
  const session = await getSession("member");
  if (!session || session.userId !== memberId) notFound();
  return readMemberDashboardFromDatabase(getDatabase(), session, memberId);
}

export async function readStaffDashboard(storeId: string) {
  const session = await getSession("staff");
  if (!session || session.storeId !== storeId) notFound();
  return readStaffDashboardFromDatabase(getDatabase(), session, storeId);
}

export async function readAdminDashboard() {
  const session = await getSession("admin");
  if (!session) notFound();
  return readAdminDashboardFromDatabase(getDatabase(), session);
}
