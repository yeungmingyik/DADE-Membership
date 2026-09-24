"use client";

import Image from "next/image";
import { useId } from "react";
import { useTranslations } from "next-intl";
import type { MemberSummary } from "@/lib/contracts";
import styles from "./membership-card.module.css";

function BronzeRelief({ id }: { id: string }) {
  return <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false" className={styles.bronzeRelief}>
    <defs>
      <linearGradient id={`${id}-rim`} x1="43" y1="34" x2="189" y2="221" gradientUnits="userSpaceOnUse"><stop stopColor="#fff1ce" /><stop offset=".26" stopColor="#b46e48" /><stop offset=".49" stopColor="#663b28" /><stop offset=".72" stopColor="#e4b287" /><stop offset="1" stopColor="#884e30" /></linearGradient>
      <linearGradient id={`${id}-face`} x1="64" y1="33" x2="166" y2="213" gradientUnits="userSpaceOnUse"><stop stopColor="#cf9970" /><stop offset=".44" stopColor="#b97e53" /><stop offset="1" stopColor="#f0caa2" /></linearGradient>
      <linearGradient id={`${id}-crest`} x1="84" y1="76" x2="155" y2="164" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe7bd" /><stop offset=".47" stopColor="#c38c5d" /><stop offset=".5" stopColor="#774b31" /><stop offset="1" stopColor="#d7a473" /></linearGradient>
      <pattern id={`${id}-grain`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V4" stroke="#5b301e" strokeOpacity=".15" /></pattern>
    </defs>
    <ellipse cx="123" cy="141" rx="87" ry="86" fill="#502e20" opacity=".2" />
    <circle cx="120" cy="120" r="91" fill={`url(#${id}-rim)`} />
    <circle cx="120" cy="120" r="84" stroke="#f4d2a7" strokeWidth="1" opacity=".7" />
    <circle cx="120" cy="120" r="79" fill={`url(#${id}-face)`} stroke="#6f422d" strokeWidth="1.5" />
    <circle cx="120" cy="120" r="76" fill={`url(#${id}-grain)`} />
    <circle cx="120" cy="120" r="70" stroke="#eec7a0" strokeWidth=".7" />
    {Array.from({ length: 40 }, (_, index) => <path key={index} d="M120 46V50" stroke="#7d4a2e" strokeWidth="1.1" transform={`rotate(${index * 9} 120 120)`} />)}
    <path d="M120 64 137 96 173 102 147 128 153 164 120 147 87 164 93 128 67 102 103 96Z" fill="#70402b" transform="translate(0 2)" />
    <path d="M120 62 137 94 173 100 147 126 153 162 120 145 87 162 93 126 67 100 103 94Z" fill={`url(#${id}-crest)`} stroke="#f7d2a0" strokeWidth=".8" />
    <path d="M120 62V115L137 94M173 100 120 115 147 126M153 162 120 115 120 145M87 162 120 115 93 126M67 100 120 115 103 94" stroke="#794a2f" strokeOpacity=".45" />
    <path d="M94 183H146M103 188H137" stroke="#815036" strokeWidth="1.3" />
  </svg>;
}

function SilverSculpture({ id }: { id: string }) {
  return <svg viewBox="0 0 250 250" fill="none" aria-hidden="true" focusable="false" className={styles.silverSculpture}>
    <defs>
      <linearGradient id={`${id}-silver-edge`} x1="42" y1="35" x2="211" y2="204" gradientUnits="userSpaceOnUse"><stop stopColor="#fbfeff" /><stop offset=".34" stopColor="#8997a5" /><stop offset=".51" stopColor="#e6eff4" /><stop offset=".72" stopColor="#677583" /><stop offset="1" stopColor="#cdd9e1" /></linearGradient>
      <linearGradient id={`${id}-silver-light`} x1="63" y1="51" x2="135" y2="178" gradientUnits="userSpaceOnUse"><stop stopColor="#ffffff" /><stop offset=".6" stopColor="#c9d5dd" /><stop offset="1" stopColor="#8493a0" /></linearGradient>
      <linearGradient id={`${id}-silver-dark`} x1="101" y1="80" x2="192" y2="175" gradientUnits="userSpaceOnUse"><stop stopColor="#a6b5c0" /><stop offset=".46" stopColor="#51616f" /><stop offset="1" stopColor="#bac9d3" /></linearGradient>
    </defs>
    <ellipse cx="140" cy="208" rx="80" ry="13" fill="#657380" opacity=".12" />
    <path d="M42 97 100 35 201 70 220 157 151 215 62 178Z" fill={`url(#${id}-silver-edge)`} stroke="#f4f8fa" strokeWidth="1.1" />
    <path d="M42 97 100 35 115 114 62 178Z" fill={`url(#${id}-silver-light)`} />
    <path d="M100 35 201 70 115 114Z" fill="#f6fbff" />
    <path d="M201 70 220 157 167 139 115 114Z" fill={`url(#${id}-silver-dark)`} />
    <path d="M115 114 167 139 151 215 62 178Z" fill={`url(#${id}-silver-light)`} />
    <path d="M167 139 220 157 151 215Z" fill="#738391" />
    <path d="M83 110 115 76 172 95 183 146 144 179 94 158Z" fill={`url(#${id}-silver-edge)`} stroke="#e2edf4" strokeWidth="1" />
    <path d="M83 110 115 76 126 126 94 158Z" fill="#dfe8ee" />
    <path d="M115 76 172 95 126 126Z" fill="#ffffff" />
    <path d="M172 95 183 146 147 139 126 126Z" fill="#8495a3" />
    <path d="M126 126 147 139 144 179 94 158Z" fill="#bfced9" />
    <path d="M147 139 183 146 144 179Z" fill="#536673" />
    <path d="M42 97 115 114 201 70M115 114 151 215M83 110 126 126 172 95M126 126 144 179" stroke="#ffffff" strokeWidth=".8" strokeOpacity=".85" />
  </svg>;
}

function GoldEmblem({ id }: { id: string }) {
  return <svg viewBox="0 0 240 250" fill="none" aria-hidden="true" focusable="false" className={styles.goldEmblem}>
    <defs>
      <linearGradient id={`${id}-gold`} x1="46" y1="45" x2="181" y2="217" gradientUnits="userSpaceOnUse"><stop stopColor="#d9b666" /><stop offset=".23" stopColor="#fff1ba" /><stop offset=".45" stopColor="#a97a31" /><stop offset=".67" stopColor="#f4d78c" /><stop offset="1" stopColor="#997335" /></linearGradient>
      <linearGradient id={`${id}-gold-facet`} x1="96" y1="83" x2="154" y2="155" gradientUnits="userSpaceOnUse"><stop stopColor="#fff8d4" /><stop offset=".5" stopColor="#e0bc70" /><stop offset=".51" stopColor="#946928" /><stop offset="1" stopColor="#e9c674" /></linearGradient>
      <linearGradient id={`${id}-gold-shadow`} x1="57" y1="84" x2="174" y2="196" gradientUnits="userSpaceOnUse"><stop stopColor="#8a682f" /><stop offset=".5" stopColor="#30281a" /><stop offset="1" stopColor="#c29848" /></linearGradient>
    </defs>
    <path d="M120 34 188 73 188 154 120 202 52 154 52 73Z" fill="#050706" transform="translate(3 8)" />
    <path d="M120 29 188 68 188 149 120 197 52 149 52 68Z" fill={`url(#${id}-gold)`} />
    <path d="M120 39 179 73 179 145 120 187 61 145 61 73Z" fill={`url(#${id}-gold-shadow)`} stroke="#fff0b1" strokeWidth=".7" />
    <path d="M120 45 173 77 173 142 120 180 67 142 67 77Z" fill="#24251f" stroke="#8d723c" strokeWidth=".7" />
    <path d="M120 57 164 83 164 137 120 168 76 137 76 83Z" stroke="#d6af63" strokeWidth=".6" strokeDasharray="1 3" />
    <path d="M120 69 142 102 155 124 120 155 85 124 98 102Z" fill={`url(#${id}-gold-facet)`} stroke="#ffefb0" strokeWidth=".75" />
    <path d="M120 69V118L98 102M142 102 120 118 155 124M85 124 120 118V155" stroke="#7b5724" strokeOpacity=".7" strokeWidth=".8" />
    <path d="M46 156C43 125 45 94 51 69M194 156C197 125 195 94 189 69" stroke="#b99853" strokeWidth=".7" />
    <path d="M83 206 120 229 157 206M99 208 120 221 141 208" stroke={`url(#${id}-gold)`} strokeWidth="1.5" />
  </svg>;
}

export function MembershipCard({ member }: { member: MemberSummary }) {
  const t = useTranslations("Member");
  const id = useId().replace(/:/g, "");
  return <div className={`${styles.card} ${styles[member.tier]}`} role="group" aria-label={t("tierMembership", { tier: t(member.tier) })}>
    <div className={styles.material} aria-hidden="true" />
    {member.tier === "bronze" ? <BronzeRelief id={id} /> : member.tier === "silver" ? <SilverSculpture id={id} /> : <GoldEmblem id={id} />}
    <div className={styles.header}>
      <div className={styles.logo}><Image src="/brand/dade-logo.png" alt="DADE" width={92} height={32} sizes="66px" className={styles.logoImage} /></div>
      <span className={styles.tier}>{t(member.tier)}</span>
    </div>
    <div className={styles.membership}>{t("membership")}</div>
    <div className={styles.footer}>
      <p className={styles.cardholder}>{t("cardholder")}</p>
      <p className={styles.name}>{member.name}</p>
      <p className={styles.number}>{member.number}</p>
    </div>
  </div>;
}
