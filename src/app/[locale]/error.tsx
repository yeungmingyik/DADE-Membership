"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");
  return <main className="flex min-h-[70svh] flex-col items-center justify-center gap-6 px-6 text-center"><h1 className="text-xl font-medium">{t("error")}</h1><Button onClick={reset}>{t("retry")}</Button></main>;
}
