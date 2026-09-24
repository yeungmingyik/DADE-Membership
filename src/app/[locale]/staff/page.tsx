import { notFound } from "next/navigation";
import { StaffWorkspace } from "@/components/operations/staff-workspace";
import { AppHeader } from "@/components/shared/app-header";
import { requireSession } from "@/server/auth";
import { readStaffDashboard } from "@/server/queries";
import type { Locale } from "@/lib/contracts";

export default async function StaffPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await requireSession("staff", locale);
  if (!session.storeId) notFound();
  const data = await readStaffDashboard(session.storeId);
  return <><AppHeader locale={locale} surface="staff" signedIn /><StaffWorkspace locale={locale} data={data} /></>;
}
