import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/metrics";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ToastHost from "@/components/shared/ToastHost";
import ReportWizard from "@/components/daily-reports/ReportWizard";
import IdleTimeoutMonitor from "@/components/shared/IdleTimeoutMonitor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active || user.locked) {
    await destroySession();
    redirect("/login");
  }

  const settings = await getSettings();
  const permissions = await getEffectivePermissions(user.id);
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, manager: true } });

  const today = startOfToday();
  const reportsToday = await prisma.dailyReport.count({ where: { date: today, deletedAt: null } });
  const pending = Math.max(0, branches.length - reportsToday);

  return (
    <div className="app">
      <Sidebar userName={user.name} role={user.roleRef.name} pending={pending} companyName={settings.companyName} companyLogo={settings.companyLogo} permissions={permissions} />
      <div className="main">
        <Topbar userName={user.name} role={user.roleRef.name} pending={pending} />
        <div className="content">{children}</div>
      </div>
      <ToastHost />
      <ReportWizard branches={branches} />
      <IdleTimeoutMonitor />
    </div>
  );
}
