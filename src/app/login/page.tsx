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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 0, background: "var(--accent)", color: "black", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, fontWeight: 800 }}>
            PILL
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: "-1px" }}>FARMASYSTEM <span style={{ color: "var(--text-secondary)" }}>PRO</span></h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "2px" }}>Professional Core System</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: 32, borderRadius: 0, border: "2px solid var(--border)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, textTransform: "uppercase" }}>Control de Acceso</h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label" htmlFor="email" style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800 }}>Usuario</label>
              <input
                id="email"
                type="text"
                className="input"
                placeholder="ADMIN"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div>
              <label className="label" htmlFor="password" style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800 }}>Contraseña</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ borderRadius: 0 }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "white", border: "1px solid black", borderRadius: 0, color: "black", fontSize: 12, fontWeight: 800 }}>
                ERROR: {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: "center", borderRadius: 0, textTransform: "uppercase", fontWeight: 800 }}
            >
              {loading ? "VERIFICANDO..." : "INGRESAR AL SISTEMA"}
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
