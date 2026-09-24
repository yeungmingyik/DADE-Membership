import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { LanguageSwitch } from "./language-switch";
import type { Locale, Surface } from "@/lib/contracts";

export async function AppHeader({ locale, surface, signedIn = false }: { locale: Locale; surface: Surface; signedIn?: boolean }) {
  const t = await getTranslations({ locale, namespace: "Common" });
  return <header className="relative z-30 border-b border-border/80 bg-background"><div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-12"><Link href={`/${locale}/${surface}`} aria-label="DADE" className="flex shrink-0 items-center gap-5"><Image src="/brand/dade-logo.png" alt="DADE" width={92} height={32} priority className="h-auto w-[82px] sm:w-[92px]" /><span className="hidden border-l border-border pl-5 text-xs font-medium tracking-wide text-muted-foreground sm:block">{t(surface)}</span></Link><div className="flex items-center gap-1 sm:gap-3"><LanguageSwitch />{signedIn && <form action="/api/auth/logout" method="post"><input type="hidden" name="locale" value={locale} /><button className="inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t("signOut")} title={t("signOut")}><LogOut size={16} aria-hidden="true" /></button></form>}</div></div></header>;
}
