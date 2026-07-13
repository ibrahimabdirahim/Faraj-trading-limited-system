import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/metrics";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ToastHost from "@/components/ToastHost";
import ReportWizard from "@/components/ReportWizard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = await getSettings();
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, manager: true } });

  const today = startOfToday();
  const reportsToday = await prisma.dailyReport.count({ where: { date: today } });
  const pending = Math.max(0, branches.length - reportsToday);

  return (
    <div className="app">
      <Sidebar userName={user.name} role={user.role} pending={pending} />
      <div className="main">
        <Topbar fxRate={settings.fxRate} hasNotifications={pending > 0} />
        <div className="content">{children}</div>
      </div>
      <ToastHost />
      <ReportWizard branches={branches} fxRate={settings.fxRate} />
    </div>
  );
}
