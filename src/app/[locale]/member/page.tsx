import { notFound } from "next/navigation";
import { MemberWorkspace, type MemberSection } from "@/components/member/member-workspace";
import { AppHeader } from "@/components/shared/app-header";
import { requireSession } from "@/server/auth";
import { readMemberDashboard } from "@/server/queries";
import type { Locale } from "@/lib/contracts";

export default async function MemberPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ view?: string }> }) {
  const { locale } = await params;
  const session = await requireSession("member", locale);
  const data = await readMemberDashboard(session.userId);
  if (!data) notFound();
  const { view } = await searchParams;
  const section = (["card", "rewards", "activity", "account"].includes(view ?? "") ? view : "card") as MemberSection;
  return <><AppHeader locale={locale} surface="member" signedIn /><MemberWorkspace locale={locale} data={data} section={section} /></>;
}
