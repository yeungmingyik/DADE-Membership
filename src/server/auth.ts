import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Locale, Surface } from "../lib/contracts";
import { getDatabase } from "./database";
import { findSession, isSessionToken } from "./session-store";
import { cookieName, getSurface } from "./surface";

export { cookieName, getSurface } from "./surface";

export function assertSurface(surface: Surface) {
  if (getSurface() !== surface) notFound();
}

export async function getSession(surface: Surface = getSurface()) {
  assertSurface(surface);
  const token = (await cookies()).get(cookieName(surface))?.value;
  if (!token || !isSessionToken(token)) return null;
  return findSession(getDatabase(), token, surface);
}

export async function requireSession(surface: Surface, locale: Locale) {
  const session = await getSession(surface);
  if (!session) redirect(`/${locale}/login`);
  return session;
}
