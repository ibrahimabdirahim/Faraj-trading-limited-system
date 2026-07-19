import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { globalSearch } from "@/lib/search";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await globalSearch(q, user.id);
  return NextResponse.json({ results });
}
