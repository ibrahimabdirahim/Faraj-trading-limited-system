"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const MAX_FAILED_ATTEMPTS = 5;

async function recordAttempt(email: string, userId: string | null, success: boolean, reason: string) {
  const ua = (await headers()).get("user-agent") ?? "";
  await prisma.loginAttempt.create({ data: { email, userId, success, reason, userAgent: ua } });
}

export type LoginResult = { ok: false; error: string } | { ok: true };

export async function login(email: string, password: string, remember: boolean): Promise<LoginResult> {
  email = email.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordAttempt(email, null, false, "no_such_user");
    return { ok: false, error: "Incorrect email or password." };
  }
  if (user.locked) {
    await recordAttempt(email, user.id, false, "locked");
    return { ok: false, error: "This account is locked. Contact your administrator." };
  }
  if (!user.active) {
    await recordAttempt(email, user.id, false, "inactive");
    return { ok: false, error: "This account is inactive. Contact your administrator." };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    const willLock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: willLock
        ? { failedLoginAttempts: attempts, locked: true, lockedAt: new Date(), lockReason: "Too many failed login attempts" }
        : { failedLoginAttempts: attempts },
    });
    await recordAttempt(email, user.id, false, willLock ? "bad_password_locked" : "bad_password");
    return { ok: false, error: willLock ? "Too many failed attempts — this account is now locked. Contact your administrator." : "Incorrect email or password." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lastLoginAt: new Date() } });
  await recordAttempt(email, user.id, true, "password_ok");
  await createSession(user.id, remember);
  redirect("/");
}
