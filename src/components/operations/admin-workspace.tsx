"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, CreditCard, Gift, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import type { AdminDashboard, Locale, MemberSummary } from "@/lib/contracts";
import {
  ActiveBadge,
  ActivityHistory,
  ActivityRows,
  EmptyState,
  filterMembers,
  formatMoney,
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

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-[1.7rem] leading-none font-medium tracking-[-0.04em] tabular-nums xl:text-[1.85rem]">{value}</p>
    </div>
  );
}

function StoreDirectory({ stores, locale }: { stores: AdminDashboard["stores"]; locale: Locale }) {
  const t = useTranslations("Operations");
  if (stores.length === 0) return <EmptyState label={t("noStores")} icon={Store} />;
  return (
    <ul className="divide-y divide-border">
      {stores.map((store) => (
        <li key={store.id} className="px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background"><Store className="size-4 text-muted-foreground" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 truncate text-sm font-medium">{store.name[locale]}</p>
              <p className="text-xs text-muted-foreground">{t("storeMemberCount", { count: store.memberCount })}</p>
            </div>
            <ActiveBadge status={store.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TeamDirectory({ data, locale }: { data: AdminDashboard; locale: Locale }) {
  const t = useTranslations("Operations");
  if (data.staff.length === 0) return <EmptyState label={t("noStaff")} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background/65 text-[11px] text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium sm:px-6">{t("teamMember")}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">{t("role")}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium xl:table-cell">{t("store")}</th>
            <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">{t("statusLabel")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.staff.map((member) => (
            <tr key={member.id}>
              <td className="px-5 py-5 sm:px-6">
                <p className="text-[13px] font-medium">{member.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">{t.has(`roles.${member.role}`) ? t(`roles.${member.role}`) : t("roles.staff")}</p>
                <p className="mt-1 text-[11px] text-muted-foreground xl:hidden">{member.storeName[locale]}</p>
              </td>
              <td className="hidden px-4 py-5 text-xs text-muted-foreground sm:table-cell">{t.has(`roles.${member.role}`) ? t(`roles.${member.role}`) : t("roles.staff")}</td>
              <td className="hidden px-4 py-5 text-xs text-muted-foreground xl:table-cell">{member.storeName[locale]}</td>
              <td className="px-5 py-5 text-right sm:px-6"><ActiveBadge status={member.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminWorkspace({ locale, data }: { locale: Locale; data: AdminDashboard }) {
  const t = useTranslations("Operations");
  const { section, setSection, query, setQuery } = useWorkspaceNavigation("admin");
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
      title={t("headquarters")}
      subtitle={t("adminWorkspace")}
      kind="admin"
    >
      <SectionHeading
        eyebrow={t("headquarters")}
        title={t(section === "overview" ? "membershipOverview" : `nav.${section}`)}
        accessory={<span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><Store className="size-3.5" aria-hidden="true" />{t("storeCount", { count: data.stores.length })}</span>}
      />

      {section === "overview" && (
        <div className="space-y-7">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-4">
            <MetricCard label={t("totalMembers")} value={formatNumber(data.metrics.memberCount, locale)} icon={Users} />
            <MetricCard label={t("recordedPurchases")} value={formatMoney(data.metrics.purchaseCents, locale)} icon={Wallet} />
            <MetricCard label={t("pointsIssued")} value={formatNumber(data.metrics.pointsIssued, locale)} icon={CreditCard} />
            <MetricCard label={t("redemptions")} value={formatNumber(data.metrics.redemptionCount, locale)} icon={Gift} />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title={t("recentActivity")} accessory={<ViewAll onClick={() => setSection("activity")} />}>
              <ActivityRows activities={data.activities.slice(0, 5)} locale={locale} compact />
            </Panel>
            <div className="space-y-6">
              <Panel title={t("nav.stores")} accessory={<ViewAll onClick={() => setSection("stores")} />}>
                <StoreDirectory stores={data.stores.slice(0, 3)} locale={locale} />
              </Panel>
              <button
                type="button"
                onClick={() => setSection("team")}
                className="flex min-h-28 w-full items-center justify-between gap-5 rounded-2xl bg-[#292825] px-6 py-6 text-left text-[#faf9f6] transition-colors hover:bg-[#383630] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <span>
                  <span className="mb-2 block text-[11px] text-[#c9c5bd]">{t("headquarters")}</span>
                  <span className="block text-lg font-medium tracking-tight">{t("teamDirectory")}</span>
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
              </button>
            </div>
          </div>

          <Panel title={t("memberDirectory")} accessory={<ViewAll onClick={() => setSection("members")} />}>
            <MemberTable members={data.members.slice(0, 5)} locale={locale} onSelect={selectMember} />
          </Panel>
        </div>
      )}

      {section === "members" && (
        <Panel title={t("memberDirectory")} accessory={<span aria-live="polite" className="text-xs text-muted-foreground">{t("membersShownCount", { count: members.length })}</span>}>
          <div className="border-b border-border px-5 py-5 sm:px-6"><MemberSearch value={query} onChange={setQuery} /></div>
          <MemberTable members={members} locale={locale} onSelect={selectMember} filtered={query.length > 0} />
        </Panel>
      )}
      {section === "activity" && <ActivityHistory activities={data.activities} locale={locale} />}
      {section === "stores" && <Panel title={t("storeDirectory")}><StoreDirectory stores={data.stores} locale={locale} /></Panel>}
      {section === "team" && <Panel title={t("teamDirectory")}><TeamDirectory data={data} locale={locale} /></Panel>}
      <MemberDetail member={selectedMember} locale={locale} onClose={() => setSelectedMember(null)} returnFocusRef={memberTrigger} />
    </WorkspaceShell>
  );
}
