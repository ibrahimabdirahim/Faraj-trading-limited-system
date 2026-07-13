"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function login(_prev: { error: string | null }, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return { error: "No active account with that email." };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password. Please try again." };

  await createSession(user.id);
  redirect("/");
}
