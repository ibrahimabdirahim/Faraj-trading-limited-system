"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { login } from "./actions";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await login(identifier, password, remember);
    setPending(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit} className="login2-form">
      {error && <div className="login2-err">{error}</div>}
      <div className="login2-field">
        <label htmlFor="identifier">Username or Email</label>
        <div className="login2-field-input">
          <span className="login2-field-ico"><Icon name="user" size={16} /></span>
          <input id="identifier" name="identifier" type="text" autoComplete="username" placeholder="Enter your username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
      </div>
      <div className="login2-field">
        <label htmlFor="password">Password</label>
        <div className="login2-field-input">
          <span className="login2-field-ico"><Icon name="lock" size={16} /></span>
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="login2-eye-btn" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)}>
            <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>
      </div>
      <div className="login2-row">
        <label className="login2-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember Me
        </label>
        <button type="button" className="login2-forgot" onClick={() => setForgotOpen((v) => !v)}>Forgot Password?</button>
      </div>
      {forgotOpen && <div className="login2-notice">Password resets are handled by your administrator — ask them to reset it from User Management.</div>}
      <button className="login2-submit" type="submit" disabled={pending}>
        {pending ? <><span className="login2-spinner" />Signing in…</> : <><Icon name="lock" size={16} />Login</>}
      </button>
      <div className="login2-divider">or</div>
      <div className="login2-powered">Powered by <b>Faraj Trading Limited</b></div>
    </form>
  );
}
