import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";
import pkg from "../../package.json";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Shared by the clip-path (objectBoundingBox, 0-1) and the glow stroke (same curve, x100 for
// a 0-100 viewBox) so the glowing edge always traces exactly the panel's own clipped silhouette.
const WAVE_CLIP_PATH = "M 0.1,0 C 0.02,0.08 0,0.14 0.02,0.18 C 0.05,0.24 0.1,0.3 0.09,0.35 C 0.08,0.4 0.16,0.46 0.14,0.5 C 0.12,0.55 0.06,0.6 0.08,0.65 C 0.1,0.72 0.02,0.76 0.04,0.82 C 0.06,0.9 0.12,0.94 0.1,1 L 1,1 L 1,0 Z";
const WAVE_GLOW_PATH = "M 10,0 C 2,8 0,14 2,18 C 5,24 10,30 9,35 C 8,40 16,46 14,50 C 12,55 6,60 8,65 C 10,72 2,76 4,82 C 6,90 12,94 10,100";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const year = new Date().getFullYear();

  return (
    <div className={`login2-shell ${inter.variable}`}>
      <div className="login2-left">
        <div className="login2-left-inner">
          <div className="login2-brand">
            <img src="/faraj-logo-header.png" alt="Faraj Trading Limited" />
          </div>

          <div className="login2-os-title">
            <div className="login2-brand-title">Faraj OS</div>
            <div className="login2-brand-sub">Business Operating System</div>
          </div>

          <div className="login2-card">
            <LoginForm />
          </div>

          <div className="login2-footer">
            <div>© {year} <span>Faraj Trading Limited</span>. All Rights Reserved.</div>
            <div>Version {pkg.version}</div>
          </div>
        </div>
      </div>

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <clipPath id="waveClip" clipPathUnits="objectBoundingBox">
            <path d={WAVE_CLIP_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div className="login2-right" aria-hidden>
        <div className="login2-right-gradient" />
        <div className="login2-right-pattern" />
        <div className="login2-right-bigicon" />
      </div>
      <svg className="login2-wave-glow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <filter id="wave-glow-blur" x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <path d={WAVE_GLOW_PATH} stroke="#00E58A" strokeWidth="0.6" fill="none" filter="url(#wave-glow-blur)" opacity=".95" />
        <path d={WAVE_GLOW_PATH} stroke="#ffffff" strokeWidth="0.15" fill="none" opacity=".8" />
      </svg>
    </div>
  );
}
