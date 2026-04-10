"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, RefreshCw, Plus, X, Calendar, Hash, FileCheck } from "lucide-react";

interface NCFSecuencia {
  id: string; tipo: string; prefix: string; secuencia_actual: number;
  secuencia_fin: number; vencimiento: string; activo: boolean;
}

const EMPTY_NCF = { tipo: "B02", prefix: "B02", secuencia_actual: 1, secuencia_fin: 100, vencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0] };

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "admin") router.push("/dashboard");
  }, [session, router]);

  const [secuencias, setSecuencias] = useState<NCFSecuencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"nuevo" | null>(null);
  const [form, setForm] = useState(EMPTY_NCF);
  const [guardando, setGuardando] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/ncf-secuencias");
    const data = await res.json();
    setSecuencias(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crear() {
    setGuardando("nuevo");
    const res = await fetch("/api/ncf-secuencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
       setModal(null);
       setForm(EMPTY_NCF);
       await cargar();
    }
    setGuardando(null);
  }

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
      <div className="page-header" style={{ marginBottom: 40, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Configuración Fiscal</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>GESTIÓN DE COMPROBANTES DGII</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%", maxWidth: "fit-content" }}>
          <button className="btn btn-ghost" onClick={cargar} style={{ height: 52, borderRadius: 16, border: "2px solid #eff6ff" }}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> RECARGAR
          </button>
          <button className="btn btn-primary" onClick={() => setModal("nuevo")} style={{ height: 52, borderRadius: 16, padding: "0 24px" }}>
            <Plus size={20} /> NUEVO LOTE
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="glass" style={{ padding: "clamp(20px, 4vw, 40px)", borderRadius: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
             <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Settings size={22} color="#6366f1" />
             </div>
             <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Comprobantes Fiscales</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />
            )) : secuencias.map((seq) => {
              const disponibles = seq.secuencia_fin - seq.secuencia_actual + 1;
              const agotado = disponibles <= 0;
              const critico = disponibles < 100;
              
              return (
                <div key={seq.id} className="glass" style={{
                  padding: "clamp(20px, 3vw, 32px)", borderRadius: 24, border: agotado ? "2px solid #fee2e2" : "1px solid #f1f5f9",
                  background: agotado ? "linear-gradient(to right, #fef2f2, #fff)" : "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
                    <div style={{ display: "flex", gap: 24, alignItems: "center", flex: 1, minWidth: 280 }}>
                      <div style={{ 
                        width: 56, height: 56, background: "#f1f5f9", borderRadius: 16, 
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#6366f1" 
                      }}>
                        {seq.tipo}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{NCF_NOMBRES[seq.tipo] || seq.tipo}</span>
                          {agotado ? (
                            <span style={{ background: "#ef4444", color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 900 }}>AGOTADO</span>
                          ) : critico && (
                            <span style={{ background: "#f59e0b", color: "white", padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 900 }}>RECARGA</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                           <div><span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", display: "block" }}>PREFIJO</span><span style={{ fontSize: 13, fontWeight: 800, color: "#475569" }}>{seq.prefix}</span></div>
                           <div><span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", display: "block" }}>DISPONIBLES</span><span style={{ fontSize: 13, fontWeight: 900, color: agotado ? "#ef4444" : critico ? "#d97706" : "#10b981" }}>{Math.max(0, disponibles)}</span></div>
                           <div><span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", display: "block" }}>VENCE</span><span style={{ fontSize: 13, fontWeight: 800, color: "#475569" }}>{seq.vencimiento}</span></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 16, flex: 1, minWidth: 280 }}>
                      <div style={{ flex: 1 }}>
                        <label className="label" style={{ fontSize: 9, fontWeight: 900, color: "#64748b", marginBottom: 4 }}>ACTUALIZAR LÍMITE</label>
                        <input className="input" type="number" style={{ width: "100%", height: 40, borderRadius: 10, border: "2px solid #eff6ff", fontWeight: 800, fontSize: 13 }}
                          value={seq.secuencia_fin}
                          onChange={(e) => setSecuencias((prev) => prev.map((s) => s.id === seq.id ? { ...s, secuencia_fin: parseInt(e.target.value) || s.secuencia_fin } : s))} />
                      </div>
                      <button id={`guardar-ncf-${seq.id}`} className="btn btn-primary" onClick={() => actualizar(seq)} disabled={guardando === seq.id}
                        style={{ height: 40, padding: "0 16px", borderRadius: 10, fontSize: 12 }}>
                        {guardando === seq.id ? "..." : "✓"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {modal === "nuevo" && (
           <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: 500, borderRadius: 28, padding: "32px 24px" }}>
                 <div className="modal-header" style={{ marginBottom: 24 }}>
                    <div style={{ background: "#f5f3ff", padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 900, color: "#6366f1" }}>NUEVO LOTE FISCAL</div>
                    <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
                 </div>

                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                       <label className="label">TIPO DE COMPROBANTE</label>
                       <select className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, prefix: e.target.value })} style={{ height: 52, borderRadius: 14 }}>
                          {Object.entries(NCF_NOMBRES).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                       </select>
                    </div>
                    <div><label className="label">PREFIJO</label><input className="input" value={form.prefix} disabled style={{ height: 52, borderRadius: 14, background: "#f8fafc" }} /></div>
                    <div><label className="label">SECUENCIA INICIO</label><input className="input" type="number" value={form.secuencia_actual} onChange={(e) => setForm({ ...form, secuencia_actual: parseInt(e.target.value) || 1 })} style={{ height: 52, borderRadius: 14 }} /></div>
                    <div><label className="label">SECUENCIA FIN</label><input className="input" type="number" value={form.secuencia_fin} onChange={(e) => setForm({ ...form, secuencia_fin: parseInt(e.target.value) || 100 })} style={{ height: 52, borderRadius: 14 }} /></div>
                    <div style={{ gridColumn: "1 / -1" }}>
                       <label className="label">FECHA DE VENCIMIENTO</label>
                       <input className="input" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} style={{ height: 52, borderRadius: 14 }} />
                    </div>
                 </div>

                 <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ flex: 1, height: 52, borderRadius: 14 }}>CANCELAR</button>
                    <button className="btn btn-primary" onClick={crear} disabled={Boolean(guardando)} style={{ flex: 2, height: 52, borderRadius: 14 }}>
                       {guardando ? "GUARDANDO..." : "REGISTRAR LOTE"}
                    </button>
                 </div>
              </div>
           </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
           <div className="glass" style={{ padding: 24, borderRadius: 20, borderLeft: "6px solid #6366f1" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                 <FileCheck size={20} color="#6366f1" />
                 <h4 style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>VALIDACIÓN DGII</h4>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, fontWeight: 500 }}>
                Las secuencias NCF son autorizadas por la DGII. Al registrar un nuevo lote, asegúrate de que el prefijo y rango coincidan con tu autorización legal.
              </p>
           </div>
           <div className="glass" style={{ padding: 24, borderRadius: 20, borderLeft: "6px solid #10b981" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                 <Hash size={20} color="#10b981" />
                 <h4 style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>CONTROL DE RANGOS</h4>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, fontWeight: 500 }}>
                El sistema bloqueará automáticamente la venta cuando el contador alcance el límite fin configurado para prevenir multas fiscales.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
