import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { getSurface } from "@/server/surface";
import { LocaleDocument } from "@/components/shared/locale-document";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await loadMessages(locale);
  const selected = getSurface() === "member" ? { Common: messages.Common, Auth: messages.Auth, Member: messages.Member } : { Common: messages.Common, Auth: messages.Auth, Operations: messages.Operations };
  return <NextIntlClientProvider locale={locale} messages={selected} timeZone="Asia/Singapore"><LocaleDocument locale={locale} />{children}</NextIntlClientProvider>;
}
