import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Icon from "@/components/shared/Icon";
import LoginForm from "./LoginForm";
import pkg from "../../package.json";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const FEATURES = [
  { icon: "inventory", label: "Inventory Management" },
  { icon: "coins", label: "Sales & Finance" },
  { icon: "chart", label: "Reports & Analytics" },
] as const;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const year = new Date().getFullYear();

  return (
    <div className={`login2-shell ${inter.variable}`}>
      <div className="login2-left">
        <div className="login2-left-inner">
          <div className="login2-card">
            <h1 className="login2-welcome">Welcome Back</h1>
            <p className="login2-welcome-sub">Sign in to continue to Faraj OS</p>
            <LoginForm />
          </div>

          <footer className="login2-footer">
            <div>© {year} Faraj Trading Limited</div>
            <div>Business Operating System · Version {pkg.version}</div>
            <div className="login2-footer-links">
              <a href="#">Privacy Policy</a><span aria-hidden>·</span>
              <a href="#">Terms</a><span aria-hidden>·</span>
              <a href="#">Support</a>
            </div>
          </footer>
        </div>
      </div>

      <div className="login2-right" aria-hidden>
        <div className="login2-right-watermark" />
        <div className="login2-right-content">
          <div className="login2-hero-icon">
            <img src="/faraj-logo-icon.png" alt="" loading="lazy" />
          </div>
          <h2>Faraj Trading Limited</h2>
          <p className="login2-hero-sub">Business Operating System</p>
          <p className="login2-hero-desc">
            Manage all your branches, inventory, finance and reports from one secure platform.
          </p>
          <div className="login2-hero-cards">
            {FEATURES.map((f) => (
              <div className="login2-hero-card" key={f.label}>
                <span className="login2-hero-card-ico"><Icon name={f.icon} size={20} /></span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
