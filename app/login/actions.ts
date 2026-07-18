"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const MAX_FAILED_ATTEMPTS = 5;

async function recordAttempt(identifier: string, userId: string | null, success: boolean, reason: string) {
  const ua = (await headers()).get("user-agent") ?? "";
  await prisma.loginAttempt.create({ data: { email: identifier, userId, success, reason, userAgent: ua } });
}

export type LoginResult = { ok: false; error: string } | { ok: true };

// Accepts either the account's email or its username in the same field — both are unique
// columns on User, so a case-insensitive OR lookup resolves to exactly one account either way.
export async function login(identifier: string, password: string, remember: boolean): Promise<LoginResult> {
  identifier = identifier.trim().toLowerCase();
  if (!identifier || !password) return { ok: false, error: "Enter your username or email and password." };

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  if (!user) {
    await recordAttempt(identifier, null, false, "no_such_user");
    return { ok: false, error: "Incorrect username/email or password." };
  }
  if (user.locked) {
    await recordAttempt(identifier, user.id, false, "locked");
    return { ok: false, error: "This account is locked. Contact your administrator." };
  }
  if (!user.active) {
    await recordAttempt(identifier, user.id, false, "inactive");
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
    await recordAttempt(identifier, user.id, false, willLock ? "bad_password_locked" : "bad_password");
    return { ok: false, error: willLock ? "Too many failed attempts — this account is now locked. Contact your administrator." : "Incorrect username/email or password." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lastLoginAt: new Date() } });
  await recordAttempt(identifier, user.id, true, "password_ok");
  await createSession(user.id, remember);
  redirect("/");
}
