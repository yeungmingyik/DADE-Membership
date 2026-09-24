import { NextResponse, type NextRequest } from "next/server";
import { isLocale, preferredLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-policy";

export function proxy(request: NextRequest) {
  const surface = process.env.APP_SURFACE ?? "member";
  if (!["member", "staff", "admin"].includes(surface)) {
    return new NextResponse(null, { status: 503 });
  }
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const origin = requestOrigin(request);
  if (!origin) return new NextResponse(null, { status: 400 });
  if (!segments.length) {
    const saved = request.cookies.get("dade_locale")?.value;
    const locale = saved && isLocale(saved) ? saved : preferredLocale(request.headers.get("accept-language"));
    return NextResponse.redirect(new URL(`/${locale}/${surface}`, origin));
  }
  const locale = segments[0];
  if (!isLocale(locale)) return new NextResponse(null, { status: 404 });
  if (segments.length === 1) return NextResponse.redirect(new URL(`/${locale}/${surface}`, origin));
  if (["member", "staff", "admin"].includes(segments[1]) && segments[1] !== surface) {
    return new NextResponse(null, { status: 404 });
  }
  const headers = new Headers(request.headers);
  headers.set("x-dade-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set("dade_locale", locale, { path: "/", sameSite: "lax", maxAge: 31_536_000, httpOnly: true });
  return response;
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
