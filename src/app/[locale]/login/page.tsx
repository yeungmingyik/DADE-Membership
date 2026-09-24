import { redirect } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { SignInForm } from "@/components/auth/sign-in-form";
import { CardSurface } from "@/components/member/card-surface";
import cardStyles from "@/components/member/membership-card.module.css";
import { getSession, getSurface } from "@/server/auth";
import type { Locale } from "@/lib/contracts";

export default async function SignInPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const surface = getSurface();
  if (await getSession(surface)) redirect(`/${locale}/${surface}`);
  const t = await getTranslations({ locale, namespace: "Auth" });
  return (
    <div className="min-h-svh">
      <AppHeader locale={locale} surface={surface} />
      <main className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-20 xl:px-28">
          <div className="mx-auto w-full max-w-[390px]">
            <p className="mb-5 text-[10px] font-semibold tracking-[0.19em] text-muted-foreground">{surface === "member" ? t("eyebrow") : "DADE"}</p>
            <h1 className="mb-10 text-[2.15rem] font-medium leading-[1.25] tracking-[-0.045em] sm:text-[2.6rem]">{t(surface === "member" ? "title" : surface === "staff" ? "staffTitle" : "adminTitle")}</h1>
            <SignInForm locale={locale} surface={surface} />
            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole size={13} aria-hidden="true" />{t("secure")}</div>
          </div>
        </div>
        <aside className="hidden items-center justify-center border-l border-border bg-[#ebe7df] px-14 py-14 lg:flex" aria-hidden="true">
          <div className="@container w-full max-w-[420px]">
            <CardSurface tier="gold" desktopOnlyArtwork>
              <div className={cardStyles.header}>
                <Image src="/brand/dade-logo.png" alt="" width={199} height={44} sizes="76px" className={cardStyles.logoImage} />
                <span className={cardStyles.tier}>{t("cardLabel")}</span>
              </div>
              <div className={cardStyles.footer}>
                <p className={cardStyles.cardholder}>DADE / SG</p>
                <p className={cardStyles.name}>{t("cardCaption")}</p>
              </div>
            </CardSurface>
          </div>
        </aside>
      </main>
    </div>
  );
}
