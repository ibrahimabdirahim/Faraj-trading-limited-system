"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { fmtDate, timeAgo } from "@/lib/format";
import { getUserActivity } from "@/app/actions";

export type UserDetail = {
  id: string; name: string; email: string; roleName: string; status: "approved" | "blocked" | "missing";
  statusLabel: string; branchLabel: string; createdAt: Date; lastLoginAt: Date | null; lockReason: string;
};

type LoginAttemptRow = { id: string; success: boolean; reason: string; createdAt: Date };
type AuditLogRow = { id: string; action: string; entity: string; detail: string; createdAt: Date; user: { name: string } | null };

export default function UserDetailModal({ user }: { user: UserDetail }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logins, setLogins] = useState<LoginAttemptRow[] | null>(null);
  const [activity, setActivity] = useState<AuditLogRow[] | null>(null);

  async function show() {
    setOpen(true);
    setLoading(true);
    const res = await getUserActivity(user.id);
    setLogins(res.loginAttempts);
    setActivity(res.auditLogs);
    setLoading(false);
  }

  return (
    <>
      <button className="icon-btn" title="View details" aria-label="View details" onClick={show}><Icon name="eye" size={15} /></button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head"><Icon name="users" size={20} stroke={2} /><h3>{user.name}</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="set-row"><div className="info"><h4>Email</h4><p>{user.email}</p></div></div>
              <div className="set-row"><div className="info"><h4>Role</h4><p>{user.roleName}</p></div></div>
              <div className="set-row"><div className="info"><h4>Branch assignment</h4><p>{user.branchLabel}</p></div></div>
              <div className="set-row"><div className="info"><h4>Status</h4><p>{user.statusLabel}{user.lockReason ? ` — ${user.lockReason}` : ""}</p></div></div>
              <div className="set-row"><div className="info"><h4>Created</h4><p>{fmtDate(user.createdAt)}</p></div></div>
              <div className="set-row"><div className="info"><h4>Last login</h4><p>{user.lastLoginAt ? `${fmtDate(user.lastLoginAt)} (${timeAgo(user.lastLoginAt)})` : "Never logged in"}</p></div></div>

              <h4 style={{ marginTop: 18, marginBottom: 6, fontSize: 13.5 }}>Login history</h4>
              {loading ? <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Loading…</p> : (
                logins && logins.length ? (
                  <div className="table-wrap"><table>
                    <thead><tr><th>When</th><th>Result</th><th>Reason</th></tr></thead>
                    <tbody>{logins.map((l) => (
                      <tr key={l.id}><td className="dot-unit">{timeAgo(l.createdAt)}</td>
                        <td><span className={`status ${l.success ? "approved" : "blocked"}`}><i />{l.success ? "Success" : "Failed"}</span></td>
                        <td className="dot-unit">{l.reason || "—"}</td></tr>
                    ))}</tbody>
                  </table></div>
                ) : <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No login attempts recorded yet.</p>
              )}

              <h4 style={{ marginTop: 18, marginBottom: 6, fontSize: 13.5 }}>Activity</h4>
              {loading ? <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Loading…</p> : (
                activity && activity.length ? (
                  <div className="feed">
                    {activity.map((a) => (
                      <div className="feed-item" key={a.id}><div className="feed-dot" />
                        <div><div className="feed-txt"><b style={{ textTransform: "capitalize" }}>{a.action}</b> · {a.entity}{a.detail ? ` · ${a.detail}` : ""}{a.user ? ` · by ${a.user.name}` : ""}</div>
                          <div className="feed-time">{timeAgo(a.createdAt)}</div></div></div>
                    ))}
                  </div>
                ) : <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No activity recorded yet.</p>
              )}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
