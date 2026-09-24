import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { isLocale } from "@/i18n/config";
import { AuthDraftProvider } from "@/components/auth/auth-draft-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "DADE",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/dade-logo.png" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f7f4" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-dade-locale") ?? "en";
  return <html lang={isLocale(locale) ? locale : "en"}><body><AuthDraftProvider>{children}</AuthDraftProvider></body></html>;
}
