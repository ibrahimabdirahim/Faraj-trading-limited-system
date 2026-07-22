import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import Icon from "@/components/shared/Icon";
import LoginForm from "./LoginForm";
import pkg from "../../package.json";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const FEATURES = [
  { icon: "inventory", label: "Real-time inventory across every branch and warehouse" },
  { icon: "transfer", label: "End-to-end supplier and logistics tracking" },
  { icon: "chart", label: "Live cash, profit, and performance analytics" },
] as const;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const settings = await getSettings();
  const year = new Date().getFullYear();

  return (
    <div className={`login2-shell ${inter.variable}`}>
      <div className="login2-left">
        <div className="login2-left-inner">
          <div className="login2-brand">
            <div className="login2-logo">
              {settings.companyLogo ? <img src={settings.companyLogo} alt={settings.companyName} /> : "F"}
            </div>
            <div>
              <div className="login2-brand-title">Faraj OS</div>
              <div className="login2-brand-sub">Business Operating System</div>
            </div>
          </div>

          <div className="login2-card">
            <h1>Welcome back</h1>
            <p>Sign in to manage your branches, reports and finances.</p>
            <LoginForm />
            <div className="login2-powered">Powered by Faraj Trading Limited</div>
          </div>

          <div className="login2-footer">
            <div>Faraj Trading Limited · Business Operating System</div>
            <div>Version {pkg.version} · © {year} Faraj Trading Limited. All Rights Reserved.</div>
          </div>
        </div>
      </div>

      <div className="login2-right" aria-hidden>
        <div className="login2-hero-image" />
        <div className="login2-hero-overlay" />
        <div className="login2-right-content">
          <div className="login2-hero-logo">
            <img src="/faraj-logo.png" alt="Faraj Trading Limited" />
          </div>

          <div className="login2-hero-bottom">
          <div className="login2-badge"><Icon name="building" size={14} />Enterprise Business Platform</div>
          <h2>Run your entire operation from one platform.</h2>
          <p>Inventory, suppliers, finance, and reporting — unified for Faraj Trading Limited&apos;s branches and warehouse.</p>
          <ul className="login2-features">
            {FEATURES.map((f) => (
              <li key={f.label}><span className="login2-feature-ico"><Icon name={f.icon} size={16} /></span>{f.label}</li>
            ))}
          </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
