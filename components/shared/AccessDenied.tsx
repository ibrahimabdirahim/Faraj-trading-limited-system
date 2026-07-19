import Icon from "@/components/shared/Icon";

export default function AccessDenied({ module }: { module: string }) {
  return (
    <div className="card"><div className="empty">
      <Icon name="lock" className="ico" size={44} stroke={1.5} />
      <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>Access denied</div>
      <div style={{ margin: "4px auto 0", maxWidth: 360 }}>
        Your role doesn&apos;t have permission to view {module}. Ask an administrator if you need access.
      </div>
    </div></div>
  );
}
