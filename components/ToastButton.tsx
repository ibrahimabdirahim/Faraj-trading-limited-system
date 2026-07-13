"use client";
import Icon from "./Icon";
import { toast } from "@/lib/toast";

export default function ToastButton({ title, message = "", label, icon, variant = "plain", className = "btn" }: { title: string; message?: string; label: string; icon?: string; variant?: "primary" | "plain"; className?: string }) {
  return (
    <button className={`${className} ${variant === "primary" ? "btn-primary" : ""}`} onClick={() => toast(title, message)}>
      {icon && <Icon name={icon} className="ico" size={16} />}{label}
    </button>
  );
}
