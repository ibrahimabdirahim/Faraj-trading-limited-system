// Pure constants/types for the RBAC system — no "server-only", no Prisma import, so this
// file is safe to import from client components (e.g. the permission matrix UI). Anything
// that touches the database lives in lib/permissions.ts instead.

export const MODULES = [
  "dashboard", "daily-reports", "products", "inventory",
  "branches", "finance", "reports", "suppliers", "settings", "user-management",
] as const;
export type Module = (typeof MODULES)[number];

export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "print"] as const;
export type Action = (typeof ACTIONS)[number];

export type RoleKey = "super_admin" | "general_admin" | "it_admin" | "branch_manager" | "accountant" | "inventory_officer" | "auditor" | "viewer";

// Roles allowed to manage other users, delete the last one of their own tier, etc.
export const ADMIN_TIER_ROLE_KEYS: RoleKey[] = ["super_admin", "general_admin", "it_admin"];

const ALL_MODULES = [...MODULES];
const ALL_ACTIONS = [...ACTIONS];
const READ_EXPORT = ["view", "export", "print"] as const;

// Hardcoded role defaults — nothing in this phase edits a role's defaults at runtime,
// so a DB-seeded mirror of this constant would just be dead weight.
export const ROLE_DEFAULTS: Record<RoleKey, Partial<Record<Module, readonly Action[]>>> = {
  super_admin: Object.fromEntries(ALL_MODULES.map((m) => [m, ALL_ACTIONS])),
  general_admin: Object.fromEntries(ALL_MODULES.map((m) => [m, ALL_ACTIONS])),
  it_admin: Object.fromEntries(ALL_MODULES.map((m) => [m, ALL_ACTIONS])),
  branch_manager: {
    "dashboard": ["view"],
    "daily-reports": ["view", "create", "edit", "approve", "export", "print"],
    "products": ["view"],
    "inventory": ["view", "edit"],
    "branches": ["view"],
    "finance": ["view", "export"],
    "reports": ["view", "export", "print"],
  },
  accountant: {
    "dashboard": ["view"],
    "daily-reports": ["view", "export", "print"],
    "finance": ["view", "create", "edit", "export", "print"],
    "reports": ["view", "export", "print"],
    "products": ["view"],
    "inventory": ["view"],
    "suppliers": ["view", "create", "edit", "approve", "export", "print"],
  },
  inventory_officer: {
    "dashboard": ["view"],
    "products": ["view", "create", "edit"],
    "inventory": ["view", "create", "edit", "export"],
    "branches": ["view"],
    "daily-reports": ["view"],
    "reports": ["view"],
    "suppliers": ["view", "create"],
  },
  auditor: Object.fromEntries(ALL_MODULES.map((m) => [m, READ_EXPORT])),
  viewer: {
    "dashboard": ["view"],
    "daily-reports": ["view"],
    "products": ["view"],
    "inventory": ["view"],
    "branches": ["view"],
    "finance": ["view"],
    "reports": ["view"],
    "suppliers": ["view"],
  },
};

export type PermissionMap = Record<Module, Record<Action, boolean>>;

export function emptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean>])
  ) as PermissionMap;
}

export function roleDefaultMap(roleKey: RoleKey): PermissionMap {
  const map = emptyPermissionMap();
  const grants = ROLE_DEFAULTS[roleKey] ?? {};
  for (const m of MODULES) for (const a of grants[m] ?? []) map[m][a] = true;
  return map;
}
