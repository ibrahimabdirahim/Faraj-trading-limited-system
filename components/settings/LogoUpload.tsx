"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { updateCompanyLogo } from "@/app/actions";

function resizeToDataUrl(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function LogoUpload({ logo, companyName }: { logo: string; companyName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(logo);
  const initials = companyName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Invalid file", "Please choose an image file"); return; }
    const dataUrl = await resizeToDataUrl(file);
    setPreview(dataUrl);
    setSaving(true);
    const res = await updateCompanyLogo(dataUrl);
    setSaving(false);
    if (res.ok) { toast("Logo updated", "Shown across the sidebar and reports"); router.refresh(); }
  }

  return (
    <div className="set-row">
      <div className="info"><h4>Company logo</h4><p>Shown in the sidebar and on exported/printed reports</p></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", background: "var(--surface-2)", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
          {preview ? <img src={preview} alt="Company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontWeight: 700, color: "var(--muted)" }}>{initials}</span>}
        </div>
        <button className="btn" disabled={saving} onClick={() => inputRef.current?.click()}><Icon name="camera" className="ico" size={15} />{saving ? "Uploading…" : preview ? "Change logo" : "Upload logo"}</button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </div>
  );
}
