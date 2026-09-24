import type { Surface } from "../lib/contracts";

export function getSurface(): Surface {
  const value = process.env.APP_SURFACE;
  if (value === undefined) return "member";
  if (value === "member" || value === "staff" || value === "admin") return value;
  throw new Error("APP_SURFACE_INVALID");
}

export function cookieName(surface: Surface) {
  return `dade_${surface}_session`;
}
