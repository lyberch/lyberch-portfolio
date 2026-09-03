 "use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Terminal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Invalid admin credentials.");
        return;
      }

      router.replace("/admin/dashboard");
    } catch {
      setError("Could not sign in. Please try again.");
    }
  }

  return <main className="admin-shell">
    <a href="/" className="back-home"><ArrowLeft size={15}/> Back to site</a>
    <div className="login-card">
      <div className="login-brand"><Terminal size={20}/> LYBERCH<span>_</span></div>
      <p className="label">ADMIN ACCESS</p><h1>Welcome back.</h1><p className="muted">Sign in to manage your portfolio projects.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter email" required/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></label>
        {error && <div className="error">{error}</div>}
        <button className="button full" type="submit">Sign in <LockKeyhole size={16}/></button>
      </form>
    </div>
  </main>
}