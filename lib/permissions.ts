import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getCurrentUser, destroySession } from "./session";
import { MODULES, ACTIONS, roleDefaultMap, emptyPermissionMap, type Module, type Action, type RoleKey, type PermissionMap } from "./permissionTypes";

export * from "./permissionTypes";

// Merges the role default with sparse per-user overrides (override always wins). Cached per-request.
export const getEffectivePermissions = cache(async (userId: string): Promise<PermissionMap> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roleRef: true, permissions: true } });
  const map = user?.roleRef ? roleDefaultMap(user.roleRef.key as RoleKey) : emptyPermissionMap();
  for (const p of user?.permissions ?? []) {
    if (MODULES.includes(p.module as Module) && ACTIONS.includes(p.action as Action)) {
      map[p.module as Module][p.action as Action] = p.allowed;
    }
  }
  return map;
});

export async function hasPermission(userId: string, module: Module, action: Action): Promise<boolean> {
  const map = await getEffectivePermissions(userId);
  return map[module][action];
}

// Drop-in replacement for the old requireUser(): throws if not logged in, if the account
// is inactive/locked (re-checked here, not just in the layout, so a lock takes effect
// immediately even against a server action fired from an already-open stale tab), or if
// the effective permission is missing. Returns the User on success.
export async function requirePermission(module: Module, action: Action) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!user.active || user.locked) {
    await destroySession();
    throw new Error("This account is no longer active.");
  }
  const allowed = await hasPermission(user.id, module, action);
  if (!allowed) throw new Error("You do not have permission to do this.");
  return user;
}

// For server component pages (not server actions) — redirects to /login if not authenticated,
// otherwise returns the effective permission for the given module/action so the page can
// render its own Access Denied state instead of throwing into Next's generic error boundary.
export async function checkPageAccess(module: Module, action: Action = "view") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active || user.locked) {
    await destroySession();
    redirect("/login");
  }
  const allowed = await hasPermission(user.id, module, action);
  return { user, allowed };
}
