import { FileText, CheckCircle2, Package, Boxes, Settings2, UserCog, Building2, CircleDollarSign, Activity } from "lucide-react";
import { fmtTime } from "@/lib/format";

type ActivityItem = { id: string; action: string; entity: string; detail: string; branchName: string | null; createdAt: Date; user: { name: string } | null };

const ENTITY_ICON: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  DailyReport: { icon: <FileText size={15} />, bg: "var(--brand-soft)", color: "var(--brand-2)" },
  Product: { icon: <Package size={15} />, bg: "var(--cdf-soft)", color: "var(--cdf)" },
  Expense: { icon: <CircleDollarSign size={15} />, bg: "var(--faraj-blue)", color: "#fff" },
  InventoryValuation: { icon: <Boxes size={15} />, bg: "var(--warn-soft)", color: "var(--warn)" },
  Settings: { icon: <Settings2 size={15} />, bg: "var(--surface-2)", color: "var(--muted)" },
  User: { icon: <UserCog size={15} />, bg: "var(--faraj-blue)", color: "#fff" },
  UserPermission: { icon: <UserCog size={15} />, bg: "var(--faraj-blue)", color: "#fff" },
  Branch: { icon: <Building2 size={15} />, bg: "var(--faraj-green)", color: "#fff" },
};

function labelFor(a: ActivityItem): string {
  if (a.entity === "DailyReport") return a.action === "approve" ? "Report approved" : "Daily report imported";
  if (a.entity === "Product") return "Product added";
  if (a.entity === "Expense") return "Expense added";
  if (a.entity === "InventoryValuation") return "Inventory value saved";
  if (a.entity === "Settings") return "Settings updated";
  if (a.entity === "Branch") return `Branch ${a.action}d`;
  if (a.entity === "User" || a.entity === "UserPermission") {
    const map: Record<string, string> = {
      create: "User created", update: "User updated", delete: "User deleted", lock: "Account locked", unlock: "Account unlocked",
      activate: "Account activated", deactivate: "Account deactivated", "reset-password": "Password reset",
      "set-password": "Password set", "change-password": "Password changed",
    };
    return map[a.action] ?? "User activity";
  }
  return a.action;
}

export default function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  if (!activity.length) {
    return (
      <div className="timeline">
        <div className="timeline-item">
          <div className="timeline-ico" style={{ background: "var(--surface-2)", color: "var(--muted)" }}><Activity size={15} /></div>
          <div className="timeline-body"><div className="timeline-txt">No activity yet today.</div><div className="timeline-time">—</div></div>
        </div>
      </div>
    );
  }
  return (
    <div className="timeline">
      {activity.map((a) => {
        const approvedReport = a.entity === "DailyReport" && a.action === "approve";
        const meta = approvedReport
          ? { icon: <CheckCircle2 size={15} />, bg: "var(--good-soft)", color: "var(--good)" }
          : ENTITY_ICON[a.entity] ?? { icon: <Activity size={15} />, bg: "var(--surface-2)", color: "var(--muted)" };
        return (
          <div className="timeline-item" key={a.id}>
            <div className="timeline-ico" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
            <div className="timeline-body">
              <div className="timeline-txt">
                <b>{labelFor(a)}</b>{a.branchName ? ` · ${a.branchName}` : ""}{a.detail && a.detail !== a.branchName ? ` · ${a.detail}` : ""}{a.user ? ` · by ${a.user.name}` : ""}
              </div>
              <div className="timeline-time">{fmtTime(a.createdAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
