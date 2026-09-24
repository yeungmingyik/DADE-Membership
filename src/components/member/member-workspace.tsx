"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CreditCard,
  Gift,
  History,
  LogOut,
  QrCode,
  ReceiptText,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Activity, Locale, MemberDashboard, MemberSummary, Reward } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { MembershipCard } from "./membership-card";
import { PointsCollection } from "./points-collection";

export type MemberSection = "card" | "rewards" | "activity" | "account";

type MemberWorkspaceProps = {
  locale: Locale;
  data: MemberDashboard;
  section?: MemberSection;
};

const focusClasses = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background";

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string, locale: Locale, full = false) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-SG" : locale, {
    day: "numeric",
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" as const, hour: "2-digit" as const, minute: "2-digit" as const } : {}),
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function formatMoney(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-SG" : locale, {
    style: "currency",
    currency: "SGD",
    currencyDisplay: "code",
  }).format(cents / 100);
}

function maskedPhone(phone: string) {
  if (phone.length < 7) return "••••";
  return `${phone.slice(0, 3)} •••• ${phone.slice(-4)}`;
}

function MemberCode({ member }: { member: MemberSummary }) {
  const t = useTranslations("Member");

  if (!member.qrToken) {
    return (
      <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-100 px-5 py-3 text-sm text-stone-500">
        <QrCode aria-hidden="true" className="size-4" />
        {t("codeUnavailable")}
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={cn("flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-stone-700 motion-reduce:transition-none", focusClasses)}>
          <QrCode aria-hidden="true" className="size-[18px]" />
          {t("showCode")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl p-5 sm:p-7">
        <DialogHeader className="text-center">
          <DialogTitle>{t("memberCode")}</DialogTitle>
          <DialogDescription>{t("scanCode")}</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[266px] rounded-2xl border border-stone-200 bg-white p-6">
          <QRCodeSVG value={member.qrToken} size={216} className="h-auto w-full" level="M" bgColor="#ffffff" fgColor="#20201e" title={t("memberCode")} />
        </div>
        <div className="space-y-1 text-center">
          <p className="font-medium [overflow-wrap:anywhere]">{member.name}</p>
          <p className="font-mono text-sm tracking-wider text-muted-foreground [overflow-wrap:anywhere]">{member.number}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PointsOverview({ member, locale }: { member: MemberSummary; locale: Locale }) {
  const t = useTranslations("Member");
  const progress = member.nextTierVisits ? Math.min(100, (member.visits / member.nextTierVisits) * 100) : 100;

  return (
    <div className="flex min-w-0 flex-col rounded-[1.4rem] border border-border bg-white/70 p-5 md:p-6 lg:p-7">
      <div className="@container min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{t("pointsBalance")}</p>
        <p className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 font-medium leading-none tracking-[-0.055em] tabular-nums">
          <span className="min-w-0 text-[clamp(1.5rem,12cqi,3.1rem)] [overflow-wrap:anywhere]">{formatNumber(member.points, locale)}</span>
          <span className="text-sm font-normal tracking-normal text-muted-foreground">{t("points")}</span>
        </p>
      </div>
      <PointsCollection points={member.points} />
      <div className="mt-3 min-w-0 border-t border-border pt-4 md:mt-auto md:pt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] md:mb-3 md:text-xs">
          <span className="text-muted-foreground">{t("qualifyingVisits")}</span>
          <span className="min-w-0 font-medium tabular-nums [overflow-wrap:anywhere]">{formatNumber(member.visits, locale)}{member.nextTierVisits !== null && <span className="font-normal text-muted-foreground"> / {formatNumber(member.nextTierVisits, locale)}</span>}</span>
        </div>
        <div role="progressbar" aria-label={t("qualifyingVisits")} aria-valuemin={0} aria-valuemax={Math.max(1, member.nextTierVisits ?? member.visits)} aria-valuenow={Math.min(member.visits, member.nextTierVisits ?? member.visits)} aria-valuetext={member.nextTierVisits !== null ? t("visitsProgress", { current: member.visits, total: member.nextTierVisits }) : t("highestTier")} className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
          <div className="h-full rounded-full bg-[#746b5a]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere] md:mt-3 md:text-xs">{member.nextTierVisits !== null ? t("visitsToNextTier", { count: Math.max(0, member.nextTierVisits - member.visits) }) : t("highestTier")}</p>
      </div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: Activity["kind"] }) {
  const Icon = kind === "purchase" ? ArrowUpRight : kind === "refund" ? ArrowDownLeft : kind === "redemption" ? Gift : Check;
  return <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />;
}

function ActivityRow({ activity, locale }: { activity: Activity; locale: Locale }) {
  const t = useTranslations("Member");
  const points = `${activity.pointsDelta > 0 ? "+" : ""}${formatNumber(activity.pointsDelta, locale)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={cn("grid min-h-[84px] w-full grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-xl py-4 text-left transition-colors hover:bg-stone-100/70 sm:flex sm:items-center sm:gap-4 sm:px-2 motion-reduce:transition-none", focusClasses)}>
          <span className="row-span-2 flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-[#f1eeea] text-[#403a36] sm:size-11"><ActivityIcon kind={activity.kind} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{t(activity.kind)}</span>
            <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">{activity.storeName[locale]} · {formatDate(activity.occurredAt, locale)}</span>
          </span>
          <span className="col-start-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 [overflow-wrap:anywhere] sm:block sm:max-w-[44%] sm:shrink-0 sm:text-right">
            <span className="block text-sm font-medium tabular-nums">{points} <span className="text-xs font-normal text-muted-foreground">{t("points")}</span></span>
            {activity.amountCents !== null && <span className="block text-xs tabular-nums text-muted-foreground sm:mt-1">{formatMoney(activity.amountCents, locale)}</span>}
          </span>
          <ChevronRight aria-hidden="true" className="hidden size-4 text-stone-400 sm:block" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl p-5 sm:p-7">
        <DialogHeader>
          <DialogTitle>{t("activityDetails")}</DialogTitle>
          <DialogDescription>{t(activity.kind)}</DialogDescription>
        </DialogHeader>
        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", activity.status === "cancelled" ? "border-stone-200 bg-stone-100 text-stone-600" : "border-[#ddd4ca] bg-[#f1eeea] text-[#403a36]")}>
          {activity.status !== "cancelled" && <Check aria-hidden="true" className="size-3.5" />}
          {t(activity.status)}
        </span>
        <dl className="divide-y divide-border text-sm">
          <Detail label={t("store")} value={activity.storeName[locale]} />
          <Detail label={t("date")} value={formatDate(activity.occurredAt, locale, true)} />
          {activity.amountCents !== null && <Detail label={t("amount")} value={formatMoney(activity.amountCents, locale)} />}
          <Detail label={t("pointsChange")} value={points} />
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] items-start gap-4 py-4"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{value}</dd></div>;
}

function EmptyState({ icon: Icon, label }: { icon: typeof Gift; label: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300/80 px-5 py-8 text-center"><Icon aria-hidden="true" className="size-6 text-stone-400" strokeWidth={1.3} /><p className="text-sm text-muted-foreground">{label}</p></div>;
}

function RewardTile({ reward, locale, index }: { reward: Reward; locale: Locale; index: number }) {
  const t = useTranslations("Member");
  const name = reward.name[locale];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={cn("group w-full overflow-hidden rounded-2xl border border-border bg-white/80 text-left transition-shadow hover:shadow-sm motion-reduce:transition-none", focusClasses)}>
          <div className={cn("relative flex aspect-[1.6] items-center justify-center overflow-hidden", index % 2 === 0 ? "bg-[#e9e6df]" : "bg-[#e0dfd9]")}>
            {reward.image ? <Image src={reward.image} alt={name} fill sizes="(max-width: 640px) 45vw, 280px" className="object-cover" /> : <div className="relative flex size-[88px] items-center justify-center rounded-full border border-white/70 bg-white/30"><Gift aria-hidden="true" className="size-11 text-[#716a5d]" strokeWidth={1.1} /></div>}
            {reward.stock === 0 && <span className="absolute bottom-3 left-3 rounded-full border border-stone-300/70 bg-white/90 px-2.5 py-1 text-[10px] text-stone-600">{t("outOfStock")}</span>}
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="min-h-10 text-sm font-medium [overflow-wrap:anywhere]">{name}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">{t("pointsValue", { count: reward.points })}</p>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-stone-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
            </div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl p-5 sm:p-7">
        <DialogHeader>
          <DialogTitle className="pr-10 leading-snug [overflow-wrap:anywhere]">{name}</DialogTitle>
          <DialogDescription>{t("rewardDetails")}</DialogDescription>
        </DialogHeader>
        <div className="relative flex aspect-[1.4] items-center justify-center overflow-hidden rounded-xl bg-[#e9e6df]">
          {reward.image ? <Image src={reward.image} alt={name} fill sizes="340px" className="object-cover" /> : <Gift aria-hidden="true" className="size-16 text-[#716a5d]" strokeWidth={1} />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 font-medium [overflow-wrap:anywhere]">{t("pointsValue", { count: reward.points })}</p>
          <p className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">{reward.stock > 0 ? t("stockCount", { count: reward.stock }) : t("outOfStock")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberNavigation({ locale, section }: { locale: Locale; section: MemberSection }) {
  const t = useTranslations("Member");
  const tabs = [{ name: "card", icon: CreditCard }, { name: "rewards", icon: Gift }, { name: "activity", icon: History }, { name: "account", icon: UserRound }] as const;

  return (
    <nav aria-label={t("navigation")} className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-[#fbfaf8]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md md:static md:mb-7 md:rounded-2xl md:border md:p-1.5 md:backdrop-blur-none">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 md:max-w-none">
        {tabs.map(({ name, icon: Icon }) => <Link key={name} href={`/${locale}/member${name === "card" ? "" : `?view=${name}`}`} aria-current={section === name ? "page" : undefined} className={cn("flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors md:min-h-11 md:flex-row md:gap-2 md:text-xs motion-reduce:transition-none", section === name ? "bg-[#eeebe5] text-foreground" : "text-stone-500 hover:bg-stone-100 hover:text-foreground", focusClasses)}><Icon aria-hidden="true" className="size-[19px]" strokeWidth={section === name ? 1.8 : 1.5} />{t(name)}</Link>)}
      </div>
    </nav>
  );
}

export function MemberWorkspace({ locale, data, section = "card" }: MemberWorkspaceProps) {
  const t = useTranslations("Member");
  const { member, activities, rewards } = data;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pt-7 md:pb-12">
      <MemberNavigation locale={locale} section={section} />
      <header className="mb-5 flex items-end justify-between gap-3 sm:mb-7">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p className="mb-2 text-xs text-muted-foreground">{section === "card" ? t("greeting", { name: member.name.split(" ")[0] || member.name }) : t("yourMembership")}</p>
          <h1 className="text-[1.7rem] font-medium leading-tight tracking-[-0.035em] sm:text-[2rem]">{section === "card" ? t("yourMembership") : t(section)}</h1>
        </div>
        {section === "card" && <span className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/70 text-sm font-medium text-stone-600" aria-hidden="true">{member.name.slice(0, 1).toLocaleUpperCase(locale)}</span>}
      </header>

      {section === "card" && <>
        <section className="mx-auto grid max-w-md grid-cols-1 gap-3 md:max-w-none md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-6" aria-label={t("card")}>
          <div className="@container min-w-0 space-y-3 md:space-y-4"><MembershipCard member={member} /><MemberCode member={member} /></div>
          <PointsOverview member={member} locale={locale} />
        </section>
        <div className="mt-6 grid grid-cols-1 gap-7 sm:mt-8 sm:gap-9 lg:mt-11 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
          <section className="min-w-0" aria-labelledby="member-recent-activity">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 id="member-recent-activity" className="text-base font-medium tracking-tight">{t("recentActivity")}</h2><Link href={`/${locale}/member?view=activity`} aria-label={t("allActivity")} className={cn("inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground", focusClasses)}>{t("viewAll")}<ChevronRight aria-hidden="true" className="size-3.5" /></Link></div>
            {activities.length ? <div className="divide-y divide-border">{activities.slice(0, 3).map(activity => <ActivityRow key={activity.id} activity={activity} locale={locale} />)}</div> : <EmptyState icon={ReceiptText} label={t("noActivity")} />}
          </section>
          <section className="min-w-0" aria-labelledby="member-reward-selection">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 id="member-reward-selection" className="text-base font-medium tracking-tight">{t("rewardSelection")}</h2><Link href={`/${locale}/member?view=rewards`} className={cn("inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground", focusClasses)}>{t("viewAll")}<ChevronRight aria-hidden="true" className="size-3.5" /></Link></div>
            {rewards.length ? <div className="grid grid-cols-2 gap-3">{rewards.slice(0, 2).map((reward, index) => <RewardTile key={reward.id} reward={reward} locale={locale} index={index} />)}</div> : <EmptyState icon={Gift} label={t("noRewards")} />}
          </section>
        </div>
      </>}

      {section === "rewards" && <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-border bg-white/70 px-5 py-4"><span className="text-sm text-muted-foreground">{t("pointsBalance")}</span><span className="min-w-0 text-lg font-medium tracking-tight tabular-nums [overflow-wrap:anywhere]">{t("pointsValue", { count: member.points })}</span></div>
        {rewards.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{rewards.map((reward, index) => <RewardTile key={reward.id} reward={reward} locale={locale} index={index} />)}</div> : <EmptyState icon={Gift} label={t("noRewards")} />}
      </>}

      {section === "activity" && <section aria-label={t("activity")} className="rounded-2xl border border-border bg-white/60 px-4 sm:px-6">{activities.length ? <div className="divide-y divide-border">{activities.map(activity => <ActivityRow key={activity.id} activity={activity} locale={locale} />)}</div> : <div className="py-4"><EmptyState icon={ReceiptText} label={t("noActivity")} /></div>}</section>}

      {section === "account" && <div className="mx-auto max-w-xl">
        <section aria-labelledby="member-profile" className="rounded-2xl border border-border bg-white/70 p-6">
          <div className="mb-5 flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full bg-[#eeebe5] text-xl font-medium text-stone-600" aria-hidden="true">{member.name.slice(0, 1).toLocaleUpperCase(locale)}</span><div><h2 id="member-profile" className="font-medium">{t("profile")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("tierMembership", { tier: t(member.tier) })}</p></div></div>
          <dl className="divide-y divide-border text-sm"><Detail label={t("fullName")} value={member.name} /><Detail label={t("memberNumber")} value={member.number} /><Detail label={t("mobileNumber")} value={maskedPhone(member.phone)} /><Detail label={t("membershipTier")} value={t(member.tier)} /></dl>
        </section>
        <form action="/api/auth/logout" method="post" className="mt-5"><input type="hidden" name="locale" value={locale} /><button type="submit" className={cn("flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-white/70 px-5 py-3 text-sm font-medium transition-colors hover:bg-stone-100 motion-reduce:transition-none", focusClasses)}><span className="flex items-center gap-2.5"><LogOut aria-hidden="true" className="size-4" />{t("signOut")}</span><ArrowRight aria-hidden="true" className="size-4 text-stone-500" /></button></form>
      </div>}

    </div>
  );
}
