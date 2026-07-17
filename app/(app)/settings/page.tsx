import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/format";
import Icon from "@/components/shared/Icon";
import SettingsForm from "@/components/settings/SettingsForm";
import ToastButton from "@/components/shared/ToastButton";
import AddBranchForm from "@/components/branches/AddBranchForm";
import EditBranchForm from "@/components/branches/EditBranchForm";
import LogoUpload from "@/components/settings/LogoUpload";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";

export const dynamic = "force-dynamic";

const NAV = [
  ["#company", "Company & Currencies", "building"],
  ["#branches", "Branches", "branch"],
  ["#account", "My Account", "key"],
  ["#backup", "Backup", "download"],
  ["#audit", "Audit Logs", "report"],
];

export default async function SettingsPage() {
  const settings = await getSettings();
  const branches = await prisma.branch.findMany({ orderBy: { sortOrder: "asc" } });
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: true } });

  return (
    <>
      <div className="page-head"><div><div className="page-title">Settings</div><div className="page-sub">Company, branches, currencies and system configuration</div></div></div>
      <div className="card set-grid">
        <div className="set-nav">
          {NAV.map((n, i) => <a key={n[0]} href={n[0]} className={i === 0 ? "on" : ""}><Icon name={n[2]} size={16} />{n[1]}</a>)}
        </div>
        <div className="set-body">
          <section id="company">
            <LogoUpload logo={settings.companyLogo} companyName={settings.companyName} />
            <SettingsForm initial={settings} />
          </section>

          <section id="branches" style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ fontSize: 16 }}>Branches</h3>
              <AddBranchForm />
            </div>
            <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 12 }}><table>
              <thead><tr><th>Branch</th><th>Manager</th><th>Type</th><th>Status</th><th></th></tr></thead>
              <tbody>{branches.map((b) => (
                <tr key={b.id}><td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} />{b.name}</span></td>
                  <td>{b.manager}</td><td className="dot-unit" style={{ textTransform: "capitalize" }}>{b.type}</td>
                  <td><span className={`status ${b.active ? "approved" : "missing"}`}><i />{b.active ? "Active" : "Inactive"}</span></td>
                  <td style={{ textAlign: "right" }}><EditBranchForm branch={{ id: b.id, name: b.name, manager: b.manager, color: b.color, type: b.type }} /></td></tr>
              ))}</tbody>
            </table></div>
          </section>

          <section style={{ marginTop: 32 }}>
            <div className="set-row"><div className="info"><h4>Users &amp; permissions</h4><p>Roles, branch access, login history and account security now live on their own page.</p></div>
              <Link className="btn btn-primary" href="/users"><Icon name="users" className="ico" size={16} />Open User Management</Link></div>
          </section>

          <section id="account" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>My Account</h3>
            <ChangePasswordForm />
          </section>

          <section id="backup" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Backup</h3>
            <div className="set-row"><div className="info"><h4>Database backup</h4><p>The entire system is a single file — <code style={{ fontFamily: "var(--mono)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 5 }}>database/prisma/dev.db</code>. Copy it to back up everything.</p></div>
              <ToastButton title="Backup ready" message="Copy database/prisma/dev.db to your backup drive" label="Download backup" icon="download" /></div>
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
