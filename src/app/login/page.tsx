"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 50%), var(--bg-primary)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, var(--accent), var(--accent-dark))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, boxShadow: "0 8px 32px var(--accent-glow)" }}>
            💊
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>FarmaSystem <span style={{ color: "var(--accent-light)" }}>Pro</span></h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Sistema de Facturación Profesional</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label" htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="admin@farmasystem.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: "center" }}
            >
              {loading ? (
                <><span className="animate-spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%" }} /> Verificando...</>
              ) : "Iniciar Sesión →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-muted)" }}>
          FarmaSystem Pro © {new Date().getFullYear()} — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
