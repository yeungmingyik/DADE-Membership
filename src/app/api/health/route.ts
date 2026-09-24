import { NextResponse } from "next/server";
import { getSurface } from "@/server/surface";

export function GET() {
  getSurface();
  return NextResponse.json({ status: "ok" });
}
