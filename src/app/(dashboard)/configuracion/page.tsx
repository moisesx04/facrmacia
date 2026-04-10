"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, RefreshCw } from "lucide-react";

interface NCFSecuencia {
  id: string; tipo: string; prefix: string; secuencia_actual: number;
  secuencia_fin: number; vencimiento: string; activo: boolean;
}

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "admin") router.push("/dashboard");
  }, [session, router]);

  const [secuencias, setSecuencias] = useState<NCFSecuencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/ncf-secuencias");
    const data = await res.json();
    setSecuencias(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function actualizar(seq: NCFSecuencia) {
    setGuardando(seq.id);
    await fetch("/api/ncf-secuencias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seq),
    });
    setGuardando(null);
    await cargar();
  }

  const NCF_NOMBRES: Record<string, string> = { B01: "Crédito Fiscal", B02: "Consumidor Final", B14: "Gubernamental" };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Gestión de secuencias NCF y parámetros del sistema</p>
        </div>
        <button className="btn btn-ghost" onClick={cargar}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Settings size={18} color="var(--accent-light)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Secuencias NCF (Comprobantes Fiscales)</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-sm)" }} />
            )) : secuencias.map((seq) => {
              const disponibles = seq.secuencia_fin - seq.secuencia_actual + 1;
              const agotado = disponibles <= 0;
              return (
                <div key={seq.id} style={{
                  padding: 20, borderRadius: "var(--radius-sm)",
                  border: `1px solid ${agotado ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  background: agotado ? "rgba(239,68,68,0.05)" : "var(--bg-card)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span className="badge badge-purple">{seq.tipo}</span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{NCF_NOMBRES[seq.tipo] || seq.tipo}</span>
                        {agotado && <span className="badge badge-danger">AGOTADO</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <span>Prefijo: <strong>{seq.prefix}</strong></span>
                        <span>Actual: <strong>{seq.secuencia_actual}</strong></span>
                        <span>Fin: <strong>{seq.secuencia_fin}</strong></span>
                        <span>Disponibles: <strong style={{ color: agotado ? "var(--danger)" : disponibles < 100 ? "var(--warning)" : "var(--success)" }}>{Math.max(0, disponibles)}</strong></span>
                        <span>Vence: <strong>{seq.vencimiento}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                      <div>
                        <label className="label" style={{ fontSize: 11 }}>Nuevo límite</label>
                        <input className="input" type="number" style={{ width: 140 }}
                          value={seq.secuencia_fin}
                          onChange={(e) => setSecuencias((prev) => prev.map((s) => s.id === seq.id ? { ...s, secuencia_fin: parseInt(e.target.value) || s.secuencia_fin } : s))} />
                      </div>
                      <button id={`guardar-ncf-${seq.id}`} className="btn btn-primary btn-sm" onClick={() => actualizar(seq)} disabled={guardando === seq.id}>
                        {guardando === seq.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
