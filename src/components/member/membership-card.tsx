"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { MemberSummary } from "@/lib/contracts";
import { CardSurface } from "./card-surface";
import styles from "./membership-card.module.css";

export function MembershipCard({ member }: { member: MemberSummary }) {
  const t = useTranslations("Member");

  return (
    <CardSurface tier={member.tier} role="group" aria-label={t("tierMembership", { tier: t(member.tier) })}>
      <div className={styles.header}>
        <Image src="/brand/dade-logo.png" alt="DADE" width={199} height={44} sizes="76px" className={styles.logoImage} />
        <span className={styles.tier}>{t(member.tier)}</span>
      </div>
      <div className={styles.footer}>
        <p className={styles.cardholder}>{t("cardholder")}</p>
        <p className={styles.name}>{member.name}</p>
        <p className={styles.number}>{member.number}</p>
      </div>
    </CardSurface>
  );
}
