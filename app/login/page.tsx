import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const settings = await getSettings();

  return (
    <div className="login-wrap">
      <div className="login-blob b1" />
      <div className="login-blob b2" />
      <div className="login-blob b3" />
      <div className="login-illustration" aria-hidden>
        <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <g stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="60,420 190,340 300,380 420,240 560,280 720,140" />
            <circle cx="720" cy="140" r="7" fill="#fff" />
          </g>
          <g fill="#fff">
            <rect x="90" y="470" width="34" height="90" rx="4" style={{ transformOrigin: "90px 560px", animation: "barGrow 1.2s .1s ease both" }} />
            <rect x="150" y="430" width="34" height="130" rx="4" style={{ transformOrigin: "150px 560px", animation: "barGrow 1.2s .25s ease both" }} />
            <rect x="210" y="500" width="34" height="60" rx="4" style={{ transformOrigin: "210px 560px", animation: "barGrow 1.2s .4s ease both" }} />
            <rect x="640" y="450" width="34" height="110" rx="4" style={{ transformOrigin: "640px 560px", animation: "barGrow 1.2s .3s ease both" }} />
            <rect x="700" y="410" width="34" height="150" rx="4" style={{ transformOrigin: "700px 560px", animation: "barGrow 1.2s .45s ease both" }} />
          </g>
          <g fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="600" cy="90" r="26" />
            <circle cx="645" cy="60" r="14" />
          </g>
        </svg>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-mark">
            {settings.companyLogo ? <img src={settings.companyLogo} alt={settings.companyName} /> : "F"}
          </div>
          <div>
            <div className="login-title">Faraj OS</div>
            <div className="login-sub">{settings.companyName}</div>
          </div>
        </div>
        <div className="login-welcome">
          <h1>Welcome back</h1>
          <p>Sign in to manage your branches, reports and finances.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
