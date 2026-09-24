export const locales = ["en", "zh-CN"] as const;
export type AppLocale = (typeof locales)[number];

export function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function preferredLocale(header: string | null) {
  const choices = (header ?? "").split(",").map((part) => {
    const [tag, quality] = part.trim().split(";q=");
    return { tag: tag.toLowerCase(), quality: quality ? Number(quality) : 1 };
  }).filter((item) => item.quality > 0).sort((a, b) => b.quality - a.quality);
  for (const { tag } of choices) {
    if (tag === "zh" || tag === "zh-cn" || tag.startsWith("zh-hans")) return "zh-CN";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}
