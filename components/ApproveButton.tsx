"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveReport } from "@/app/actions";
import { toast } from "@/lib/toast";

export default function ApproveButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="mini-btn" disabled={busy} onClick={async () => {
      setBusy(true);
      const res = await approveReport(id);
      setBusy(false);
      if (res.ok) { toast("Report approved", `${name} locked`); router.refresh(); }
    }}>{busy ? "…" : "Approve"}</button>
  );
}
