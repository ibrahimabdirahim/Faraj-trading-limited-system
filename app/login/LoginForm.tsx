"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { login } from "./actions";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await login(email, password, remember);
    setPending(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="login-err">{error}</div>}
      <div className="login-field">
        <label htmlFor="email">Username or Email</label>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="you@faraj.cd" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="login-field">
        <label htmlFor="password">Password</label>
        <div className="login-field-input">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="login-eye-btn" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)}>
            <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>
      </div>
      <div className="login-row">
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>
        <button type="button" className="login-forgot" onClick={() => setForgotOpen((v) => !v)}>Forgot password?</button>
      </div>
      {forgotOpen && <div className="login-notice">Password resets are handled by your administrator — ask them to reset it from User Management.</div>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
        {pending ? "Signing in…" : <><Icon name="logout" size={16} />Sign in to Faraj OS</>}
      </button>
    </form>
  );
}
