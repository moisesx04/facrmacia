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
      setLoading(false);
    } else {
      // router.replace is faster than push (no history entry) and we skip
      // router.refresh() because the middleware will handle auth on the new route.
      router.replace("/dashboard");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 0, background: "#000000", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, fontWeight: 800 }}>
            PILL
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: "-1px", color: "#000000" }}>FARMASYSTEM <span style={{ color: "#64748b" }}>PRO</span></h1>
          <p style={{ color: "#64748b", fontSize: 13, textTransform: "uppercase", letterSpacing: "2px" }}>Professional Core System</p>
        </div>

        {/* Card */}
        <div style={{ padding: 40, borderRadius: 0, border: "3px solid #000000", background: "#ffffff", boxShadow: "10px 10px 0px #000000" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, textTransform: "uppercase", color: "#000000", textAlign: "center", borderBottom: "2px solid #000000", paddingBottom: 12 }}>Acceso al Sistema</h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label" htmlFor="email" style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, color: "#000000" }}>Credencial Usuario</label>
              <input
                id="email"
                type="text"
                className="input"
                placeholder="ADMIN"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ borderRadius: 0, border: "2px solid #000000", background: "#ffffff", color: "#000000", fontWeight: 700 }}
              />
            </div>

            <div>
              <label className="label" htmlFor="password" style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, color: "#000000" }}>Contraseña Seguridad</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ borderRadius: 0, border: "2px solid #000000", background: "#ffffff", color: "#000000" }}
              />
            </div>

            {error && (
              <div style={{ padding: "12px", background: "#000000", border: "1px solid #000000", borderRadius: 0, color: "#ffffff", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
                ALERTA: {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: 8, justifyContent: "center", borderRadius: 0, textTransform: "uppercase", fontWeight: 800, background: "#000000", color: "#ffffff", height: 54 }}
            >
              {loading ? "PROCESANDO..." : "INGRESAR AHORA"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-muted)" }}>
          FARMACIA ARCHI DOMINICANA © {new Date().getFullYear()} — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
