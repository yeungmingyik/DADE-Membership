"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronDown, Globe2, Loader2, Search } from "lucide-react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Locale, Surface } from "@/lib/contracts";
import { useAuthDraft } from "./auth-draft-provider";

const inputClass = "h-13 w-full rounded-xl border border-input bg-white px-4 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/15 disabled:opacity-60";

export function SignInForm({ locale, surface }: { locale: Locale; surface: Surface }) {
  const t = useTranslations("Auth");
  const { draft, setDraft } = useAuthDraft();
  const { phone, country, email } = draft;
  const setCountry = (value: CountryCode) => setDraft((previous) => ({ ...previous, country: value }));
  const setPhone = (value: string) => setDraft((previous) => ({ ...previous, phone: value }));
  const setEmail = (value: string) => setDraft((previous) => ({ ...previous, email: value }));
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryTrigger = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalidPhone" | "invalidInput" | "unavailable" | "networkError" | null>(null);
  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const englishNames = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), []);
  const chineseNames = useMemo(() => new Intl.DisplayNames(["zh-CN"], { type: "region" }), []);
  const countries = useMemo(() => getCountries().map((code) => ({ code, name: regionNames.of(code) ?? code, englishName: englishNames.of(code) ?? code, chineseName: chineseNames.of(code) ?? code, prefix: getCountryCallingCode(code) })).sort((a, b) => a.code === "SG" ? -1 : b.code === "SG" ? 1 : a.name.localeCompare(b.name, locale)), [regionNames, englishNames, chineseNames, locale]);
  const filtered = countries.filter((item) => `${item.name} ${item.englishName} ${item.chineseName} ${item.code} +${item.prefix}`.toLowerCase().includes(search.trim().toLowerCase()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (surface === "member" && !parsePhoneNumberFromString(phone, country)?.isValid()) {
      setError("invalidPhone");
      return;
    }
    if (surface !== "member" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password)) {
      setError("invalidInput");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surface === "member" ? { phone, country } : { email, password })
      });
      const result = await response.json();
      setError(result.code === "INVALID_PHONE" ? "invalidPhone" : result.code === "INVALID_INPUT" ? "invalidInput" : "unavailable");
    } catch {
      setError("networkError");
    } finally {
      setPending(false);
    }
  }

  return <>
    <form onSubmit={submit} noValidate className="space-y-6" aria-busy={pending}>
      {surface === "member" ? <div className="space-y-5">
        <div className="space-y-2.5"><label className="block text-xs font-medium text-foreground" id="country-label">{t("country")}</label><button ref={countryTrigger} type="button" disabled={pending} aria-labelledby="country-label country-value" aria-haspopup="dialog" onClick={() => { setSearch(""); setCountryOpen(true); }} className={`${inputClass} flex items-center justify-between gap-3 text-left`}><span className="flex items-center gap-3"><Globe2 size={17} className="text-muted-foreground" aria-hidden="true" /><span id="country-value" className="text-sm">{regionNames.of(country)}</span></span><ChevronDown size={16} aria-hidden="true" className="text-muted-foreground" /></button></div>
        <div className="space-y-2.5"><label htmlFor="mobile" className="block text-xs font-medium">{t("mobile")}</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm tabular-nums text-muted-foreground">+{getCountryCallingCode(country)}</span><input id="mobile" type="tel" autoComplete="tel-national" inputMode="tel" value={phone} required maxLength={40} disabled={pending} placeholder={t("phonePlaceholder")} aria-invalid={error === "invalidPhone"} aria-describedby={error ? "sign-in-error" : undefined} onChange={(event) => { const value = event.target.value; setPhone(value); setError(null); if (value.trim().startsWith("+")) { const parsed = parsePhoneNumberFromString(value); if (parsed?.country) { setCountry(parsed.country); setPhone(parsed.nationalNumber); } } }} className={`${inputClass} pl-[5.2rem]`} /></div></div>
      </div> : <div className="space-y-5"><div className="space-y-2.5"><label className="block text-xs font-medium" htmlFor="email">{t("email")}</label><input id="email" type="email" autoComplete="username" required maxLength={254} value={email} disabled={pending} onChange={(event) => { setEmail(event.target.value); setError(null); }} className={inputClass} /></div><div className="space-y-2.5"><label className="block text-xs font-medium" htmlFor="password">{t("password")}</label><input id="password" type="password" autoComplete="current-password" required maxLength={256} value={password} disabled={pending} onChange={(event) => { setPassword(event.target.value); setError(null); }} className={inputClass} /></div></div>}
      {error && <p role="alert" id="sign-in-error" className="rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive">{t(error)}</p>}
      <Button type="submit" disabled={pending} className="h-13 w-full justify-between rounded-xl px-5 text-sm">{pending ? t("pending") : surface === "member" ? t("continue") : t("signIn")}{pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</Button>
    </form>
    <Dialog open={countryOpen} onOpenChange={setCountryOpen}><DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); countryTrigger.current?.focus(); }} className="gap-0 overflow-hidden p-0 sm:max-w-md"><DialogHeader className="px-6 pb-4 pt-6 text-left"><DialogTitle>{t("country")}</DialogTitle><DialogDescription className="sr-only">{t("countrySearch")}</DialogDescription></DialogHeader><div className="relative mx-6 mb-4"><Search className="absolute left-3 top-3.5 text-muted-foreground" size={16} aria-hidden="true" /><input type="search" aria-label={t("countrySearch")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("countrySearch")} className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm" /></div><div className="max-h-[55svh] overflow-y-auto border-t p-2">{filtered.length ? filtered.map((item) => <button key={item.code} type="button" onClick={() => { setCountry(item.code); setCountryOpen(false); setError(null); }} aria-pressed={country === item.code} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-sm hover:bg-muted"><span className="min-w-0 flex-1">{item.name}</span><span className="text-xs tabular-nums text-muted-foreground">+{item.prefix}</span>{country === item.code && <Check size={16} aria-hidden="true" />}</button>) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noCountries")}</p>}</div></DialogContent></Dialog>
  </>;
}
