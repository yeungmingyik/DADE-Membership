import { AdminWorkspace } from "@/components/operations/admin-workspace";
import { AppHeader } from "@/components/shared/app-header";
import { requireSession } from "@/server/auth";
import { readAdminDashboard } from "@/server/queries";
import type { Locale } from "@/lib/contracts";

export default async function AdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  await requireSession("admin", locale);
  const data = await readAdminDashboard();
  return <><AppHeader locale={locale} surface="admin" signedIn /><AdminWorkspace locale={locale} data={data} /></>;
}
