"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
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
  Menu,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Activity, Locale, MemberSummary } from "@/lib/contracts";

export type Section = "overview" | "members" | "activity" | "stores" | "team";

type NavigationItem = {
  section: Section;
  icon: LucideIcon;
};

function moveButtonFocus(event: KeyboardEvent<HTMLButtonElement>, container: HTMLElement | null, horizontal = false) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing || !container) return;
  const previous = event.key === "ArrowUp" || (horizontal && event.key === "ArrowLeft");
  const next = event.key === "ArrowDown" || (horizontal && event.key === "ArrowRight");
  if (!previous && !next && event.key !== "Home" && event.key !== "End") return;
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-focus-item]:not(:disabled)"))
    .filter((button) => button.getClientRects().length > 0 && window.getComputedStyle(button).visibility === "visible");
  const currentIndex = buttons.indexOf(event.currentTarget);
  if (currentIndex < 0) return;
  const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, currentIndex + (next ? 1 : -1)));
  event.preventDefault();
  buttons[targetIndex]?.focus();
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopNavigation = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeDesktopMenu = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeDesktopMenu);
    return () => desktop.removeEventListener("change", closeDesktopMenu);
  }, []);
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
          <p className="text-sm font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {kind === "admin" && <div className="flex items-center justify-between gap-3 px-4 py-2 lg:hidden">
          <p className="min-w-0 text-sm font-medium">{t(`nav.${section}`)}</p>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 gap-2 px-3 text-xs"><Menu className="size-4" aria-hidden="true" />{t("openNavigation")}</Button>
            </DialogTrigger>
            <DialogContent className="top-0 left-0 h-svh max-h-none w-[min(20rem,calc(100%-3rem))] max-w-none translate-x-0 translate-y-0 content-start gap-6 rounded-none border-y-0 border-l-0 px-4 pt-7 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:max-w-none" onCloseAutoFocus={(event) => {
              if (window.matchMedia("(min-width: 1024px)").matches) {
                event.preventDefault();
                desktopNavigation.current?.querySelector<HTMLButtonElement>('button[aria-current="page"]')?.focus();
              }
            }}>
              <DialogHeader className="px-2 pr-8 text-left">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{subtitle}</DialogDescription>
              </DialogHeader>
              <nav aria-label={t("navigation")} className="grid gap-2">
                {navigation.map(({ section: item, icon: Icon }) => <button key={item} type="button" data-focus-item aria-current={section === item ? "page" : undefined} onKeyDown={(event) => moveButtonFocus(event, event.currentTarget.closest("nav"), true)} onClick={() => { onSectionChange(item); setMenuOpen(false); }} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${section === item ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4 shrink-0" aria-hidden="true" />{t(`nav.${item}`)}</button>)}
              </nav>
            </DialogContent>
          </Dialog>
        </div>}
        <nav ref={desktopNavigation} aria-label={t("navigation")} className={`${kind === "admin" ? "hidden lg:flex" : "grid grid-cols-3 lg:flex"} gap-1 px-3 py-3 lg:flex-col lg:px-4 lg:py-0`}>
          {navigation.map(({ section: item, icon: Icon }) => (
            <button
              key={item}
              type="button"
              data-focus-item
              aria-current={section === item ? "page" : undefined}
              onKeyDown={(event) => moveButtonFocus(event, event.currentTarget.closest("nav"), true)}
              onClick={() => onSectionChange(item)}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm lg:justify-start lg:gap-3 lg:px-3.5 ${
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
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-9 xl:px-12">
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground [overflow-wrap:anywhere]">{eyebrow}</p>}
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-[2rem]">{title}</h1>
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
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:min-h-[4.5rem] sm:px-6 sm:py-4">
        <h2 className="min-w-0 text-sm font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h2>
        {accessory && <div className="shrink-0">{accessory}</div>}
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
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className="relative w-full sm:max-w-md">
      <label htmlFor={id} className="sr-only">{t("filterMembers")}</label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        id={id}
        type="search"
        autoComplete="off"
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
          }
        }}
        placeholder={t("filterMembers")}
        className="h-11 w-full rounded-lg border border-input bg-background pr-11 pl-10 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label={t("clearFilter")}
          onClick={() => {
            onChange("");
            input.current?.focus({ preventScroll: true });
          }}
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
  const tableId = useId();
  if (members.length === 0) return <EmptyState label={t(filtered ? "noMatchingMembers" : "noMembers")} />;

  return (
    <div>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-background/65 text-[11px] font-medium text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium sm:px-6">{t("member")}</th>
            <th scope="col" className="hidden w-24 px-3 py-3 font-medium md:table-cell">{t("membership")}</th>
            <th scope="col" className="w-[32%] px-4 py-3 text-right font-medium sm:w-28 sm:px-6">{t("points")}</th>
            <th scope="col" className="hidden w-28 px-5 py-3 text-right font-medium xl:table-cell">{t("visits")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => (
            <tr key={member.id} className="transition-colors hover:bg-muted/35 focus-within:bg-muted/50">
              <td className="py-1 pl-4 sm:pl-6">
                <button
                  type="button"
                  data-focus-item
                  onKeyDown={(event) => moveButtonFocus(event, event.currentTarget.closest("tbody"))}
                  onClick={(event) => onSelect(member, event.currentTarget)}
                  aria-label={t("viewMember", { name: member.name })}
                  aria-describedby={`${tableId}-${member.id}`}
                  className="flex min-h-[4.25rem] w-full min-w-0 items-center gap-2 rounded-md py-3 pr-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-3 sm:pr-3"
                >
                  <span className="hidden sm:contents"><MemberAvatar name={member.name} /></span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block text-[13px] font-medium">{member.name}</span>
                    <span className="mt-1 block text-[11px] tracking-wide text-muted-foreground">{member.number}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground xl:hidden"><span className="md:hidden"><TierBadge tier={member.tier} /></span><span>{t("visitCount", { count: member.visits })}</span></span>
                  </span>
                </button>
                <span id={`${tableId}-${member.id}`} className="sr-only">{member.number}. {t("membership")}: {t(`tier.${member.tier}`)}. {t("qualifyingVisits")}: {formatNumber(member.visits, locale)}.</span>
              </td>
              <td className="hidden px-3 py-3 md:table-cell"><TierBadge tier={member.tier} /></td>
              <td className="px-4 py-3 text-right text-xs font-medium tabular-nums [overflow-wrap:anywhere] sm:px-6 sm:text-sm">{formatNumber(member.points, locale)}</td>
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
        className="rounded-2xl p-0 sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus({ preventScroll: true });
        }}
      >
        {member && (
          <>
            <DialogHeader className="border-b border-border px-6 pt-7 pb-6 text-left">
              <p className="mb-3 text-xs font-medium text-muted-foreground">{t("memberProfile")}</p>
              <DialogTitle className="pr-3 text-2xl leading-snug font-semibold tracking-tight [overflow-wrap:anywhere]">{member.name}</DialogTitle>
              <DialogDescription className="pt-1 text-xs tracking-wide">{member.number}</DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-7">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-foreground px-5 py-5 text-background">
                <div className="min-w-0">
                  <p className="text-xs opacity-65">{t("pointsBalance")}</p>
                  <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl">{formatNumber(member.points, locale)}</p>
                </div>
                <TierBadge tier={member.tier} />
              </div>
              <dl className="space-y-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t("mobileNumber")}</dt>
                  <dd className="min-w-0 text-right font-medium tabular-nums [overflow-wrap:anywhere]" dir="ltr">{member.phone}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t("qualifyingVisits")}</dt>
                  <dd className="min-w-0 text-right font-medium tabular-nums [overflow-wrap:anywhere]">{formatNumber(member.visits, locale)}</dd>
                </div>
                {member.nextTierVisits !== null && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{t("nextTierAt")}</dt>
                    <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{t("visitCount", { count: member.nextTierVisits })}</dd>
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
          <li key={activity.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-4 sm:flex sm:items-center sm:gap-4 sm:px-6">
            <span className="row-span-2 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t(`kind.${activity.kind}`)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                {compact ? formatDay(activity.occurredAt, locale) : activity.storeName[locale]}
                <span className="mx-1.5" aria-hidden="true">·</span>
                <time dateTime={activity.occurredAt}>{formatTime(activity.occurredAt, locale)}</time>
              </p>
              {!compact && <p className="mt-1.5 break-all text-[10px] tracking-wide text-muted-foreground">{activity.id}</p>}
            </div>
            <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-left [overflow-wrap:anywhere] sm:block sm:max-w-[48%] sm:shrink-0 sm:text-right">
              {activity.amountCents !== null && <p className="text-xs font-medium tabular-nums">{formatMoney(activity.amountCents, locale)}</p>}
              {activity.pointsDelta !== 0 && (
                <p className={`text-xs font-medium tabular-nums ${activity.amountCents !== null ? "text-muted-foreground sm:mt-1" : ""}`}>
                  {t("pointsChange", { value: `${activity.pointsDelta > 0 ? "+" : ""}${formatNumber(activity.pointsDelta, locale)}` })}
                </p>
              )}
              {!compact && <p className="text-[10px] text-muted-foreground sm:mt-1.5">{t(`status.${activity.status}`)}</p>}
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
