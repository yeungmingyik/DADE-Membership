import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieName, getSurface } from "@/server/surface";
import { getDatabase } from "@/server/database";
import { findSession, isSessionToken, revokeSession } from "@/server/session-store";
import { readRequestText, sameOrigin } from "@/lib/request-policy";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  const body = await readRequestText(request, 1024);
  if (body === null) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  const surface = getSurface();
  const token = (await cookies()).get(cookieName(surface))?.value;
  if (token && isSessionToken(token)) {
    const database = getDatabase();
    const session = findSession(database, token, surface);
    if (session) revokeSession(database, session.id);
  }
  const data = new URLSearchParams(body);
  const locale = data.get("locale") === "zh-CN" ? "zh-CN" : "en";
  const response = new NextResponse(null, { status: 303, headers: { Location: `/${locale}/login` } });
  response.cookies.set(cookieName(surface), "", { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0 });
  return response;
}
