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
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Configuración Avanzada</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>GESTIÓN DE SECUENCIAS FISCALES Y PARÁMETROS</p>
        </div>
        <button className="btn btn-ghost" onClick={cargar} style={{ height: 56, borderRadius: 16, border: "2px solid #eff6ff" }}>
          <RefreshCw size={18} /> ACTUALIZAR DATOS
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="glass" style={{ padding: 40, borderRadius: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
             <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Settings size={22} color="#6366f1" />
             </div>
             <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Secuencias NCF (Comprobantes Fiscales)</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />
            )) : secuencias.map((seq) => {
              const disponibles = seq.secuencia_fin - seq.secuencia_actual + 1;
              const agotado = disponibles <= 0;
              const critico = disponibles < 100;
              
              return (
                <div key={seq.id} className="glass" style={{
                  padding: 32, borderRadius: 24, border: agotado ? "2px solid #fee2e2" : "1px solid #f1f5f9",
                  background: agotado ? "linear-gradient(to right, #fef2f2, #fff)" : "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
                    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                      <div style={{ 
                        width: 64, height: 64, background: "#f1f5f9", borderRadius: 16, 
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#6366f1" 
                      }}>
                        {seq.tipo}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{NCF_NOMBRES[seq.tipo] || seq.tipo}</span>
                          {agotado ? (
                            <span style={{ background: "#ef4444", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 900 }}>AGOTADO</span>
                          ) : critico && (
                            <span style={{ background: "#f59e0b", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 900 }}>RECARGA NECESARIA</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>PREFIJO</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: "#475569" }}>{seq.prefix}</span>
                           </div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>DISPONIBLES</span>
                              <span style={{ fontSize: 14, fontWeight: 900, color: agotado ? "#ef4444" : critico ? "#d97706" : "#10b981" }}>{Math.max(0, disponibles)}</span>
                           </div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>VENCIMIENTO</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: "#475569" }}>{seq.vencimiento}</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, alignItems: "flex-end", background: "#f8fafc", padding: 20, borderRadius: 20 }}>
                      <div style={{ flex: 1 }}>
                        <label className="label" style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 8 }}>AJUSTAR LÍMITE FINAL</label>
                        <input className="input" type="number" style={{ width: 160, height: 48, borderRadius: 12, border: "2px solid #eff6ff", fontWeight: 800 }}
                          value={seq.secuencia_fin}
                          onChange={(e) => setSecuencias((prev) => prev.map((s) => s.id === seq.id ? { ...s, secuencia_fin: parseInt(e.target.value) || s.secuencia_fin } : s))} />
                      </div>
                      <button id={`guardar-ncf-${seq.id}`} className="btn btn-primary" onClick={() => actualizar(seq)} disabled={guardando === seq.id}
                        style={{ height: 48, padding: "0 24px", borderRadius: 12 }}>
                        {guardando === seq.id ? "..." : "✓ ACTUALIZAR"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección Informativa Adicional */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
           <div className="glass" style={{ padding: 32, borderRadius: 24, borderLeft: "6px solid #6366f1" }}>
              <h4 style={{ fontWeight: 900, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>REGLAS DE VALIDACIÓN DGII</h4>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Las secuencias NCF deben ser solicitadas y aprobadas por la DGII. Una vez agotado el límite fin, el sistema bloqueará la emisión para ese tipo de comprobante hasta que se actualice el rango.
              </p>
           </div>
           <div className="glass" style={{ padding: 32, borderRadius: 24, borderLeft: "6px solid #10b981" }}>
              <h4 style={{ fontWeight: 900, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>INTEGRIDAD DE DATOS</h4>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                El sistema mantiene una trazabilidad completa de cada NCF emitido. Los cambios en los límites no afectan las facturas ya creadas, solo las futuras.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
