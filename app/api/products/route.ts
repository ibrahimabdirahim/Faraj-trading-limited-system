import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ products: [] }, { status: 401 });
  if (!(await hasPermission(user.id, "products", "view"))) return NextResponse.json({ products: [] }, { status: 403 });
  const products = await prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } });
  return NextResponse.json({ products });
}
