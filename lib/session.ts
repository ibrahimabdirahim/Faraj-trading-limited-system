import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { IDLE_LOGOUT_MS } from "./idleTimeout";

const COOKIE = "faraj_session";
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, when "remember me" is checked
// The DB record's hard cap is 30 days regardless of "remember me" — the cookie itself is what
// differs (see createSession); idle-timeout and explicit logout are the real day-to-day controls.
const HARD_EXPIRY = 60 * 60 * 24 * 30;

export async function createSession(userId: string, remember = true) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + HARD_EXPIRY * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // This app is served over plain HTTP (no TLS/reverse-proxy in front of it) — a `Secure`
    // flag here would make browsers silently refuse to store the cookie on anything but an
    // https:// origin (or exactly "localhost" in some browsers), which breaks login entirely
    // when accessed via a LAN IP or any other hostname.
    secure: false,
    // Omitting maxAge makes it a browser-session cookie (cleared on browser close) when "remember me" is off.
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
    path: "/",
  });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { roleRef: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  if (Date.now() - session.lastActivityAt.getTime() > IDLE_LOGOUT_MS) {
    await prisma.session.delete({ where: { token } });
    jar.delete(COOKIE);
    return null;
  }

  await prisma.session.update({ where: { token }, data: { lastActivityAt: new Date() } });
  return session.user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    jar.delete(COOKIE);
  }
}
