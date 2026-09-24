import { redirect } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession, getSurface } from "@/server/auth";
import type { Locale } from "@/lib/contracts";

export default async function SignInPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const surface = getSurface();
  if (await getSession(surface)) redirect(`/${locale}/${surface}`);
  const t = await getTranslations({ locale, namespace: "Auth" });
  return <div className="min-h-svh"><AppHeader locale={locale} surface={surface} /><main className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] lg:grid-cols-2"><div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-20 xl:px-28"><div className="mx-auto w-full max-w-[390px]"><p className="mb-5 text-[10px] font-semibold tracking-[0.19em] text-muted-foreground">{surface === "member" ? t("eyebrow") : "DADE"}</p><h1 className="mb-10 text-[2.15rem] font-medium leading-[1.25] tracking-[-0.045em] sm:text-[2.6rem]">{t(surface === "member" ? "title" : surface === "staff" ? "staffTitle" : "adminTitle")}</h1><SignInForm locale={locale} surface={surface} /><div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole size={13} aria-hidden="true" />{t("secure")}</div></div></div><aside className="hidden items-center justify-center border-l border-border bg-[#eaede6] px-14 lg:flex" aria-hidden="true"><div className="w-full max-w-[420px]"><div className="mb-5 flex items-center justify-between px-1 text-xs text-[#6d7565]"><span>{t("cardCaption")}</span><ArrowUpRight size={18} /></div><div className="flex aspect-[1.59] flex-col justify-between rounded-[24px] border border-[#41483c] bg-[#30362f] p-9 text-[#f4f4e9] shadow-[0_28px_60px_-30px_rgba(37,47,29,0.45)]"><div className="flex items-center justify-between"><span className="rounded-md bg-white px-3 py-2"><Image src="/brand/dade-logo.png" alt="" width={74} height={25} className="h-auto w-[74px]" /></span><span className="text-[9px] tracking-[0.22em] text-[#ccd1c5]">{t("cardLabel")}</span></div><div><div className="mb-5 h-px bg-[#ffffff20]" /><div className="flex items-center justify-between text-[10px] tracking-[0.18em] text-[#ccd1c5]"><span>DADE</span><span>SG</span></div></div></div></div></aside></main></div>;
}
