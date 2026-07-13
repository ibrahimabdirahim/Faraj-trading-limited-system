"use client";
import { useActionState } from "react";
import { login } from "./actions";
import Icon from "@/components/Icon";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, { error: null as string | null });
  return (
    <form action={formAction}>
      {state?.error && <div className="login-err">{state.error}</div>}
      <div className="login-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="you@faraj.co" defaultValue="soljaman293@gmail.com" required />
      </div>
      <div className="login-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
        {pending ? "Signing in…" : <><Icon name="logout" size={16} />Sign in to Faraj OS</>}
      </button>
    </form>
  );
}
