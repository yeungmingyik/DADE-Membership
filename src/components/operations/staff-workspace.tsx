"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Search, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale, MemberSummary, StaffDashboard } from "@/lib/contracts";
import {
  ActivityHistory,
  ActivityRows,
  filterMembers,
  formatNumber,
  MemberDetail,
  MemberSearch,
  MemberTable,
  Panel,
  SectionHeading,
  ViewAll,
  useWorkspaceNavigation,
  WorkspaceShell,
} from "./shared";

export function StaffWorkspace({ locale, data }: { locale: Locale; data: StaffDashboard }) {
  const t = useTranslations("Operations");
  const { section, setSection, query, setQuery } = useWorkspaceNavigation("staff");
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null);
  const memberTrigger = useRef<HTMLButtonElement | null>(null);
  const members = filterMembers(data.members, query);
  const selectMember = (member: MemberSummary, trigger: HTMLButtonElement) => {
    memberTrigger.current = trigger;
    setSelectedMember(member);
  };

  return (
    <WorkspaceShell
      section={section}
      onSectionChange={setSection}
      title={data.store.name[locale]}
      subtitle={t("staffWorkspace")}
      kind="staff"
    >
      <SectionHeading
        eyebrow={data.store.name[locale]}
        title={t(section === "overview" ? "staffOverview" : `nav.${section}`)}
        accessory={<span className="flex items-center gap-2 text-xs text-muted-foreground"><Store className="size-3.5" aria-hidden="true" />{t("staffWorkspace")}</span>}
      />

      {section === "overview" && (
        <div className="space-y-7">
          <div className="relative overflow-hidden rounded-2xl bg-[#292825] px-6 py-7 text-[#faf9f6] sm:px-8 sm:py-8">
            <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-8 size-64 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -top-8 -right-16 size-64 rounded-full border border-white/10" />
            <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
              <div>
                <p className="mb-4 text-[10px] font-medium tracking-[0.18em] text-[#d1cec6]">{t("brandMembership")}</p>
                <h2 className="text-2xl leading-snug font-medium tracking-tight">{t("memberDirectory")}</h2>
                <Button onClick={() => setSection("members")} variant="secondary" className="mt-5 min-h-11 gap-2 rounded-lg bg-[#faf9f6] px-4 text-xs text-[#292825] hover:bg-white">
                  <Search className="size-3.5" aria-hidden="true" />{t("browseMembers")}
                </Button>
              </div>
              <div className="flex gap-9 border-t border-white/15 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
                <div>
                  <Users className="mb-3 size-4 text-[#c9c5bd]" aria-hidden="true" />
                  <p className="text-2xl font-medium tabular-nums">{formatNumber(data.members.length, locale)}</p>
                  <p className="mt-1.5 text-[11px] text-[#c9c5bd]">{t("membersShown")}</p>
                </div>
                <div>
                  <ArrowUpRight className="mb-3 size-4 text-[#c9c5bd]" aria-hidden="true" />
                  <p className="text-2xl font-medium tabular-nums">{formatNumber(data.activities.length, locale)}</p>
                  <p className="mt-1.5 text-[11px] text-[#c9c5bd]">{t("recentRecords")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <Panel title={t("members")} accessory={<ViewAll onClick={() => setSection("members")} />}>
              <div className="border-b border-border px-5 py-4 sm:px-6"><MemberSearch value={query} onChange={setQuery} /></div>
              <MemberTable members={members.slice(0, 5)} locale={locale} onSelect={selectMember} filtered={query.length > 0} />
            </Panel>
            <Panel title={t("recentActivity")} accessory={<ViewAll onClick={() => setSection("activity")} />}>
              <ActivityRows activities={data.activities.slice(0, 5)} locale={locale} compact />
            </Panel>
          </div>
        </div>
      )}

      {section === "members" && (
        <Panel title={t("memberDirectory")} accessory={<span aria-live="polite" className="text-xs text-muted-foreground">{t("membersShownCount", { count: members.length })}</span>}>
          <div className="border-b border-border px-5 py-5 sm:px-6"><MemberSearch value={query} onChange={setQuery} /></div>
          <MemberTable members={members} locale={locale} onSelect={selectMember} filtered={query.length > 0} />
        </Panel>
      )}

      {section === "activity" && <ActivityHistory activities={data.activities} locale={locale} />}
      <MemberDetail member={selectedMember} locale={locale} onClose={() => setSelectedMember(null)} returnFocusRef={memberTrigger} />
    </WorkspaceShell>
  );
}
