import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";
import type { MemberSummary } from "@/lib/contracts";
import styles from "./membership-card.module.css";

type CardSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tier: MemberSummary["tier"];
  desktopOnlyArtwork?: boolean;
  children: ReactNode;
};

export function CardSurface({ tier, desktopOnlyArtwork = false, className = "", children, ...props }: CardSurfaceProps) {
  return (
    <div className={`${styles.card} ${styles[tier]} ${className}`} {...props}>
      <div className={`${styles.artwork} ${desktopOnlyArtwork ? styles.desktopArtwork : ""}`} aria-hidden="true">
        {!desktopOnlyArtwork && <Image src={`/member-cards/${tier}-collection-v1.webp`} alt="" width={960} height={640} className={styles.artworkImage} preload unoptimized />}
      </div>
      <div className={styles.shading} aria-hidden="true" />
      {children}
    </div>
  );
}
