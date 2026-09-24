import Link from "next/link";
import { headers } from "next/headers";
import en from "@/messages/common-en.json";
import zh from "@/messages/common-zh-CN.json";

export default async function NotFound() {
  const locale = (await headers()).get("x-dade-locale") === "zh-CN" ? "zh-CN" : "en";
  const t = locale === "en" ? en.Common : zh.Common;
  return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center"><p className="text-sm text-muted-foreground">404</p><h1 className="text-2xl font-semibold">{t.notFound}</h1><Link href={`/${locale}/login`} className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">{t.back}</Link></main>;
}
