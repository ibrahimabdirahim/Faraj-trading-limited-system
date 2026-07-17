import { prisma } from "@/lib/db";
import { requirePermission, getEffectivePermissions, roleDefaultMap, type RoleKey } from "@/lib/permissions";
import UsersTable, { type UserRow } from "@/components/users/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requirePermission("user-management", "view");

  const [users, roles, branches] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { roleRef: true, branches: { include: { branch: true } } },
    }),
    prisma.role.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: UserRow[] = await Promise.all(users.map(async (u) => ({
    id: u.id, name: u.name, email: u.email, active: u.active, locked: u.locked, lockReason: u.lockReason,
    roleId: u.roleId, roleKey: u.roleRef.key, roleName: u.roleRef.name,
    allBranches: u.allBranches, branchIds: u.branches.map((b) => b.branchId), branchNames: u.branches.map((b) => b.branch.name),
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
    effective: await getEffectivePermissions(u.id),
    roleDefaults: roleDefaultMap(u.roleRef.key as RoleKey),
  })));

  return <UsersTable users={rows} roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name }))} branches={branches} currentUserId={currentUser.id} />;
}
