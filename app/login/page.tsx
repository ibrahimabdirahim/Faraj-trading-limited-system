import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 19 }}>F</div>
          <div>
            <div className="login-title">Faraj OS</div>
            <div className="login-sub">Business Operating System</div>
          </div>
        </div>
        <LoginForm />
        <div className="login-hint">
          Demo admin — <code>soljaman293@gmail.com</code> · <code>faraj2026</code><br />
          Change this in Settings after your first sign-in.
        </div>
      </div>
    </div>
  );
}
