"use client";

export type ToastType = "ok" | "err";

export function toast(title: string, message = "", type: ToastType = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("faraj:toast", { detail: { title, message, type } }));
}

export function openReportWizard(branchId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("faraj:new-report", { detail: { branchId } }));
}
