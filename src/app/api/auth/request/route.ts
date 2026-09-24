import { NextResponse } from "next/server";
import { isSupportedCountry, type CountryCode } from "libphonenumber-js";
import { getSurface } from "@/server/surface";
import { normalizePhone } from "@/lib/phone";
import { readJsonRequest, sameOrigin } from "@/lib/request-policy";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  const body = await readJsonRequest(request);
  if (!body) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  if (getSurface() === "member") {
    const country = typeof body.country === "string" && isSupportedCountry(body.country) ? body.country as CountryCode : null;
    if (!country || typeof body.phone !== "string" || !normalizePhone(body.phone, country)) return NextResponse.json({ code: "INVALID_PHONE" }, { status: 400 });
  } else if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254 || typeof body.password !== "string" || body.password.length < 1 || body.password.length > 256) {
    return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  }
  return NextResponse.json({ code: "AUTHENTICATION_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "300" } });
}
