"use client";
import Icon from "@/components/shared/Icon";
import { openReportWizard } from "@/lib/toast";

export default function NewReportButton({ variant = "primary", label = "New Daily Report", branchId }: { variant?: "primary" | "plain"; label?: string; branchId?: string }) {
  return (
    <button className={`btn ${variant === "primary" ? "btn-primary" : ""}`} onClick={() => openReportWizard(branchId)}>
      <Icon name="plus" className="ico" size={16} stroke={2.2} />{label}
    </button>
  );
}
