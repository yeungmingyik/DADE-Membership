"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getPointsCollectionPage, POINTS_PER_PAGE } from "@/lib/points-collection";
import styles from "./points-collection.module.css";

const positions = Array.from({ length: POINTS_PER_PAGE }, (_, index) => index);

export function PointsCollection({ points }: { points: number }) {
  const t = useTranslations("Member");
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const { page, pageCount, collected } = getPointsCollectionPage(points, requestedPage);
  const statusId = useId();

  function selectPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) return;
    setRequestedPage(nextPage === pageCount ? null : nextPage);
  }

  return (
    <section className={styles.collection} aria-label={t("pointsCollection")}>
      <div className={styles.heading}>
        <h2>{t("pointsCollection")}</h2>
        <span className={styles.count} aria-hidden="true">{collected}<span> / {POINTS_PER_PAGE}</span></span>
      </div>
      <div className={styles.stamps} role="img" aria-label={t("collectedPoints", { count: collected, total: POINTS_PER_PAGE })}>
        {positions.map(position => (
          <div key={position} className={`${styles.stamp} ${position < collected ? styles.collected : styles.empty}`} aria-hidden="true">
            <span className={styles.position}>{String(position + 1).padStart(2, "0")}</span>
            <span className={styles.seal}>{position < collected && <Check strokeWidth={1.7} />}</span>
          </div>
        ))}
      </div>
      <nav className={styles.pagination} aria-label={t("pointsCollectionPages")} aria-describedby={statusId}>
        <div className={styles.controls}>
          <button type="button" onClick={() => selectPage(1)} aria-disabled={page === 1} aria-label={t("firstPointsPage")}><ChevronsLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => selectPage(page - 1)} aria-disabled={page === 1} aria-label={t("previousPointsPage")}><ChevronLeft aria-hidden="true" /></button>
        </div>
        <p id={statusId} className={styles.page} aria-live="polite" aria-atomic="true">{t("pointsPage", { current: page, total: pageCount })}</p>
        <div className={styles.controls}>
          <button type="button" onClick={() => selectPage(page + 1)} aria-disabled={page === pageCount} aria-label={t("nextPointsPage")}><ChevronRight aria-hidden="true" /></button>
          <button type="button" onClick={() => selectPage(pageCount)} aria-disabled={page === pageCount} aria-label={t("latestPointsPage")}><ChevronsRight aria-hidden="true" /></button>
        </div>
      </nav>
    </section>
  );
}
