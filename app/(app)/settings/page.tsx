import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/format";
import Icon from "@/components/Icon";
import SettingsForm from "@/components/SettingsForm";
import ToastButton from "@/components/ToastButton";

export const dynamic = "force-dynamic";

const NAV = [
  ["#company", "Company & Currencies", "building"],
  ["#branches", "Branches", "branch"],
  ["#users", "Users", "users"],
  ["#backup", "Backup", "download"],
  ["#audit", "Audit Logs", "report"],
];

export default async function SettingsPage() {
  const settings = await getSettings();
  const branches = await prisma.branch.findMany({ orderBy: { sortOrder: "asc" } });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: true } });

  return (
    <>
      <div className="page-head"><div><div className="page-title">Settings</div><div className="page-sub">Company, branches, users, currencies and system configuration</div></div></div>
      <div className="card set-grid">
        <div className="set-nav">
          {NAV.map((n, i) => <a key={n[0]} href={n[0]} className={i === 0 ? "on" : ""}><Icon name={n[2]} size={16} />{n[1]}</a>)}
        </div>
        <div className="set-body">
          <section id="company"><SettingsForm initial={settings} /></section>

          <section id="branches" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Branches</h3>
            <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 12 }}><table>
              <thead><tr><th>Branch</th><th>Manager</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>{branches.map((b) => (
                <tr key={b.id}><td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} />{b.name}</span></td>
                  <td>{b.manager}</td><td className="dot-unit" style={{ textTransform: "capitalize" }}>{b.type}</td>
                  <td><span className={`status ${b.active ? "approved" : "missing"}`}><i />{b.active ? "Active" : "Inactive"}</span></td></tr>
              ))}</tbody>
            </table></div>
          </section>

          <section id="users" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Users</h3>
            <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 12 }}><table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id}><td className="t-name">{u.name}</td><td className="num">{u.email}</td>
                  <td><span className="prod-cat" style={{ textTransform: "capitalize" }}>{u.role}</span></td>
                  <td><span className="status approved"><i />Active</span></td></tr>
              ))}</tbody>
            </table></div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>Branch logins can be added later — the data model already links users to branches.</p>
          </section>

          <section id="backup" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Backup</h3>
            <div className="set-row"><div className="info"><h4>Database backup</h4><p>The entire system is a single file — <code style={{ fontFamily: "var(--mono)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 5 }}>prisma/dev.db</code>. Copy it to back up everything.</p></div>
              <ToastButton title="Backup ready" message="Copy prisma/dev.db to your backup drive" label="Download backup" icon="download" /></div>
          </section>

          <section id="audit" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Audit Logs</h3>
            {logs.length ? (
              <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 12 }}><table>
                <thead><tr><th>Action</th><th>Entity</th><th>Detail</th><th>By</th><th>When</th></tr></thead>
                <tbody>{logs.map((l) => (
                  <tr key={l.id}><td className="t-name" style={{ textTransform: "capitalize" }}>{l.action}</td><td>{l.entity}</td>
                    <td className="dot-unit">{l.detail || "—"}</td><td>{l.user?.name ?? "—"}</td><td className="dot-unit">{timeAgo(l.createdAt)}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p style={{ fontSize: 13, color: "var(--muted)" }}>No activity logged yet.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
