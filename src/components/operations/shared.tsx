"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleOff,
  Gift,
  LayoutDashboard,
  PackageCheck,
  Search,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Activity, Locale, MemberSummary } from "@/lib/contracts";

export type Section = "overview" | "members" | "activity" | "stores" | "team";

type NavigationItem = {
  section: Section;
  icon: LucideIcon;
};

function replaceParameter(name: string, value: string) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useWorkspaceNavigation(kind: "staff" | "admin") {
  const searchParams = useSearchParams();
  const sections: Section[] = kind === "admin" ? ["overview", "members", "activity", "stores", "team"] : ["overview", "members", "activity"];
  const requestedSection = searchParams.get("view") as Section | null;
  const section = requestedSection && sections.includes(requestedSection) ? requestedSection : "overview";
  return {
    section,
    setSection: (value: Section) => replaceParameter("view", value === "overview" ? "" : value),
    query: (searchParams.get("filter") ?? "").slice(0, 100),
    setQuery: (value: string) => replaceParameter("filter", value),
  };
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-SG" : locale).format(value);
}

export function formatMoney(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-SG" : locale, {
    style: "currency",
    currency: "SGD",
    currencyDisplay: "code",
  }).format(cents / 100);
}

export function formatDay(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-SG" : locale, {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-SG" : locale, {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function WorkspaceShell({
  section,
  onSectionChange,
  title,
  subtitle,
  kind,
  children,
}: {
  section: Section;
  onSectionChange: (section: Section) => void;
  title: string;
  subtitle: string;
  kind: "staff" | "admin";
  children: ReactNode;
}) {
  const t = useTranslations("Operations");
  const navigation: NavigationItem[] = [
    { section: "overview", icon: LayoutDashboard },
    { section: "members", icon: Users },
    { section: "activity", icon: ArrowUpRight },
    ...(kind === "admin"
      ? [
          { section: "stores" as const, icon: Store },
          { section: "team" as const, icon: Users },
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-[1600px] flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-border bg-card lg:w-60 lg:border-r lg:border-b-0">
        <div className="hidden px-7 pt-9 pb-8 lg:block">
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-border bg-background">
            {kind === "staff" ? <Store className="size-[18px]" /> : <LayoutDashboard className="size-[18px]" />}
          </div>
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <nav aria-label={t("navigation")} className="flex gap-1 overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:flex-col lg:px-4 lg:py-0 [&::-webkit-scrollbar]:hidden">
          {navigation.map(({ section: item, icon: Icon }) => (
            <button
              key={item}
              type="button"
              aria-current={section === item ? "page" : undefined}
              onClick={() => onSectionChange(item)}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                section === item
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {t(`nav.${item}`)}
            </button>
          ))}
        </nav>
        <div className="mx-7 mt-10 hidden border-t border-border pt-5 lg:block">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">{t("brandMembership")}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
        {children}
      </main>
    </div>
  );
}

export function SectionHeading({
  title,
  eyebrow,
  accessory,
}: {
  title: string;
  eyebrow?: string;
  accessory?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2rem]">{title}</h1>
      </div>
      {accessory}
    </div>
  );
}

export function Panel({
  title,
  accessory,
  children,
  className = "",
}: {
  title: string;
  accessory?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-border bg-card ${className}`}>
      <div className="flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {accessory}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ label, icon: Icon = Users }: { label: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function TierBadge({ tier }: { tier: MemberSummary["tier"] }) {
  const t = useTranslations("Operations");
  const styles = {
    bronze: "border-stone-200 bg-stone-100 text-stone-600",
    silver: "border-zinc-200 bg-zinc-100 text-zinc-600",
    gold: "border-[#dfd5bf] bg-[#f3eee3] text-[#6f5d38]",
  };
  return <Badge variant="outline" className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${styles[tier]}`}>{t(`tier.${tier}`)}</Badge>;
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
      {Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "—"}
    </span>
  );
}

export function MemberSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("Operations");
  const id = useId();
  return (
    <div className="relative w-full sm:max-w-md">
      <label htmlFor={id} className="sr-only">{t("filterMembers")}</label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="search"
        autoComplete="off"
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("filterMembers")}
        className="h-11 w-full rounded-lg border border-input bg-background pr-11 pl-10 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label={t("clearFilter")}
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function filterMembers(members: MemberSummary[], query: string) {
  const normalized = query.trim().normalize("NFKC").toLocaleLowerCase();
  return members.filter((member) =>
    [member.name, member.number, member.phone].some((value) =>
      value.normalize("NFKC").toLocaleLowerCase().includes(normalized),
    ),
  );
}

export function MemberTable({
  members,
  locale,
  onSelect,
  filtered = false,
}: {
  members: MemberSummary[];
  locale: Locale;
  onSelect: (member: MemberSummary, trigger: HTMLButtonElement) => void;
  filtered?: boolean;
}) {
  const t = useTranslations("Operations");
  if (members.length === 0) return <EmptyState label={t(filtered ? "noMatchingMembers" : "noMembers")} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-background/65 text-[11px] font-medium text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium sm:px-6">{t("member")}</th>
            <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">{t("membership")}</th>
            <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">{t("points")}</th>
            <th scope="col" className="hidden px-5 py-3 text-right font-medium xl:table-cell">{t("visits")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => (
            <tr key={member.id} className="transition-colors hover:bg-muted/35">
              <td className="py-1 pl-5 sm:pl-6">
                <button
                  type="button"
                  onClick={(event) => onSelect(member, event.currentTarget)}
                  aria-label={t("viewMember", { name: member.name })}
                  className="flex min-h-[4.25rem] w-full min-w-0 items-center gap-3 rounded-md py-2 pr-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <MemberAvatar name={member.name} />
                  <span className="min-w-0">
                    <span className="block max-w-48 truncate text-[13px] font-medium">{member.name}</span>
                    <span className="mt-1 block text-[11px] tracking-wide text-muted-foreground">{member.number}</span>
                  </span>
                </button>
              </td>
              <td className="hidden px-3 py-3 md:table-cell"><TierBadge tier={member.tier} /></td>
              <td className="px-5 py-3 text-right font-medium tabular-nums sm:px-6">{formatNumber(member.points, locale)}</td>
              <td className="hidden px-5 py-3 text-right text-muted-foreground tabular-nums xl:table-cell">{formatNumber(member.visits, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MemberDetail({
  member,
  locale,
  onClose,
  returnFocusRef,
}: {
  member: MemberSummary | null;
  locale: Locale;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("Operations");
  return (
    <Dialog open={member !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="overflow-hidden rounded-2xl p-0 sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus({ preventScroll: true });
        }}
      >
        {member && (
          <>
            <DialogHeader className="border-b border-border px-6 pt-7 pb-6 text-left">
              <p className="mb-3 text-xs font-medium text-muted-foreground">{t("memberProfile")}</p>
              <DialogTitle className="text-2xl font-semibold tracking-tight">{member.name}</DialogTitle>
              <DialogDescription className="pt-1 text-xs tracking-wide">{member.number}</DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-7">
              <div className="mb-7 flex items-start justify-between rounded-xl bg-foreground px-5 py-5 text-background">
                <div>
                  <p className="text-xs opacity-65">{t("pointsBalance")}</p>
                  <p className="mt-2 text-4xl font-medium tracking-tight tabular-nums">{formatNumber(member.points, locale)}</p>
                </div>
                <TierBadge tier={member.tier} />
              </div>
              <dl className="space-y-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t("mobileNumber")}</dt>
                  <dd className="font-medium tabular-nums" dir="ltr">{member.phone}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t("qualifyingVisits")}</dt>
                  <dd className="font-medium tabular-nums">{formatNumber(member.visits, locale)}</dd>
                </div>
                {member.nextTierVisits !== null && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{t("nextTierAt")}</dt>
                    <dd className="font-medium">{t("visitCount", { count: member.nextTierVisits })}</dd>
                  </div>
                )}
              </dl>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const activityIcons: Record<Activity["kind"], LucideIcon> = {
  purchase: ArrowUpRight,
  refund: ArrowDownLeft,
  redemption: Gift,
  collection: PackageCheck,
};

export function ActivityRows({
  activities,
  locale,
  compact = false,
}: {
  activities: Activity[];
  locale: Locale;
  compact?: boolean;
}) {
  const t = useTranslations("Operations");
  if (activities.length === 0) return <EmptyState label={t("noActivity")} icon={ArrowUpRight} />;
  return (
    <ul className="divide-y divide-border">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.kind];
        return (
          <li key={activity.id} className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t(`kind.${activity.kind}`)}</p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {compact ? formatDay(activity.occurredAt, locale) : activity.storeName[locale]}
                <span className="mx-1.5" aria-hidden="true">·</span>
                <time dateTime={activity.occurredAt}>{formatTime(activity.occurredAt, locale)}</time>
              </p>
              {!compact && <p className="mt-1.5 break-all text-[10px] tracking-wide text-muted-foreground">{activity.id}</p>}
            </div>
            <div className="shrink-0 text-right">
              {activity.amountCents !== null && <p className="text-xs font-medium tabular-nums">{formatMoney(activity.amountCents, locale)}</p>}
              {activity.pointsDelta !== 0 && (
                <p className={`text-xs font-medium tabular-nums ${activity.amountCents !== null ? "mt-1 text-muted-foreground" : ""}`}>
                  {t("pointsChange", { value: `${activity.pointsDelta > 0 ? "+" : ""}${formatNumber(activity.pointsDelta, locale)}` })}
                </p>
              )}
              {!compact && <p className="mt-1.5 text-[10px] text-muted-foreground">{t(`status.${activity.status}`)}</p>}
              {compact && activity.amountCents === null && activity.pointsDelta === 0 && <p className="text-xs text-muted-foreground">{t(`status.${activity.status}`)}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityHistory({ activities, locale }: { activities: Activity[]; locale: Locale }) {
  const t = useTranslations("Operations");
  const searchParams = useSearchParams();
  const choices = ["all", "purchase", "refund", "redemption", "collection"] as const;
  const requestedKind = searchParams.get("kind") as (typeof choices)[number] | null;
  const kind = requestedKind && choices.includes(requestedKind) ? requestedKind : "all";
  const filtered = activities.filter((activity) => kind === "all" || activity.kind === kind);
  const groups = new Map<string, Activity[]>();
  for (const activity of filtered) {
    const day = formatDay(activity.occurredAt, locale);
    const records = groups.get(day) ?? [];
    records.push(activity);
    groups.set(day, records);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" aria-label={t("filterActivity")}>
        {choices.map((choice) => (
          <Button
            key={choice}
            variant={kind === choice ? "default" : "outline"}
            className="min-h-11 rounded-lg px-4 text-xs"
            aria-pressed={kind === choice}
            onClick={() => replaceParameter("kind", choice === "all" ? "" : choice)}
          >
            {t(choice === "all" ? "allRecords" : `kind.${choice}`)}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card"><EmptyState label={t("noActivity")} icon={ArrowUpRight} /></div>
      ) : (
        Array.from(groups, ([day, records]) => (
          <Panel key={day} title={day} accessory={<span className="text-xs text-muted-foreground">{t("recordCount", { count: records.length })}</span>}>
            <ActivityRows activities={records} locale={locale} />
          </Panel>
        ))
      )}
    </div>
  );
}

export function ViewAll({ onClick }: { onClick: () => void }) {
  const t = useTranslations("Operations");
  return (
    <Button variant="ghost" size="sm" className="min-h-11 gap-1.5 px-2 text-xs text-muted-foreground" onClick={onClick}>
      {t("viewAll")}<ChevronRight className="size-3.5" aria-hidden="true" />
    </Button>
  );
}

export function ActiveBadge({ status }: { status: "active" | "inactive" }) {
  const t = useTranslations("Operations");
  const Icon = status === "active" ? Check : CircleOff;
  return (
    <Badge variant="outline" className="gap-1 rounded-md border-[#ddd4ca] bg-[#f1eeea] px-2 py-1 text-[11px] font-medium text-[#403a36]">
      <Icon className="size-3" aria-hidden="true" />{t(`status.${status}`)}
    </Badge>
  );
}
