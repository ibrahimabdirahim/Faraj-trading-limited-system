import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Used by Render's health check to confirm the app is up AND the database is reachable —
// a running Next.js process with a dead DB connection should not be reported healthy.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error", error: "Database unreachable" }, { status: 503 });
  }
}
