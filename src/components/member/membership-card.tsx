"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { MemberSummary } from "@/lib/contracts";
import styles from "./membership-card.module.css";

export function MembershipCard({ member }: { member: MemberSummary }) {
  const t = useTranslations("Member");

  return (
    <div className={`${styles.card} ${styles[member.tier]}`} role="group" aria-label={t("tierMembership", { tier: t(member.tier) })}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <Image src="/brand/dade-logo.png" alt="DADE" width={92} height={32} sizes="58px" className={styles.logoImage} />
        </div>
        <span className={styles.tier}>{t(member.tier)}</span>
      </div>
      <div className={styles.artwork} aria-hidden="true">
        <Image
          src={`/member-cards/${member.tier}-collection-v1.webp`}
          alt=""
          width={960}
          height={640}
          className={styles.artworkImage}
          preload
          unoptimized
        />
      </div>
      <div className={styles.footer}>
        <p className={styles.cardholder}>{t("cardholder")}</p>
        <p className={styles.name}>{member.name}</p>
        <p className={styles.number}>{member.number}</p>
      </div>
    </div>
  );
}
