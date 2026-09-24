"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";

export function LanguageSwitch() {
  const locale = useLocale();
  const path = usePathname();
  const query = useSearchParams();
  const router = useRouter();
  const next = locale === "en" ? "zh-CN" : "en";
  const label = next === "en" ? "English" : "简体中文";
  return <button type="button" onClick={() => router.replace(`${path.replace(/^\/(en|zh-CN)/, `/${next}`)}${query.size ? `?${query}` : ""}`, { scroll: false })} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" lang={next}><Languages size={15} aria-hidden="true" />{label}</button>;
}
