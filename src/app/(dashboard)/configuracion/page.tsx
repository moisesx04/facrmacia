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
    <div className="fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="page-title">Configuración Fiscal</h1>
          <p className="page-subtitle">GESTIÓN DE COMPROBANTES DGII</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-ghost hover-lift" onClick={cargar} style={{ height: 52 }}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> RECARGAR
          </button>
          <button className="btn btn-primary hover-lift" onClick={() => setModal("nuevo")} style={{ height: 52, padding: "0 28px" }}>
            <Plus size={20} /> NUEVO LOTE
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
             <div style={{ width: 48, height: 48, background: "rgba(99, 102, 241, 0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Settings size={24} color="#6366f1" />
             </div>
             <div>
               <h2 style={{ fontSize: 20, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.03em" }}>Comprobantes Fiscales</h2>
               <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>ESTADO DE SECUENCIAS ACTIVAS</p>
             </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 24 }} />
            )) : secuencias.map((seq) => {
              const disponibles = seq.secuencia_fin - seq.secuencia_actual + 1;
              const agotado = disponibles <= 0;
              const critico = disponibles < 100;
              
              return (
                <div key={seq.id} className="card" style={{
                  padding: "24px 32px", border: agotado ? "1px solid var(--danger)" : "1px solid var(--border)",
                  background: agotado ? "#fef2f2" : "white",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap", marginBottom: 16
                }}>
                    <div style={{ display: "flex", gap: 24, alignItems: "center", flex: 1, minWidth: 300 }}>
                      <div style={{ 
                        width: 64, height: 64, background: agotado ? "#ef4444" : "#f1f5f9", borderRadius: 18, 
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 950, color: agotado ? "white" : "#6366f1",
                        boxShadow: agotado ? "0 8px 16px rgba(239,68,68,0.2)" : "none"
                      }}>
                        {seq.tipo}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <span style={{ fontSize: 18, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.02em" }}>{NCF_NOMBRES[seq.tipo] || seq.tipo}</span>
                          {agotado ? (
                            <span className="badge badge-danger">AGOTADO</span>
                          ) : critico && (
                            <span className="badge badge-warning">BAJO CONTROL</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                           <div><span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: 2 }}>PREFIJO</span><span style={{ fontSize: 14, fontWeight: 800, color: "#475569" }}>{seq.prefix}</span></div>
                           <div><span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: 2 }}>DISPONIBLES</span><span style={{ fontSize: 14, fontWeight: 950, color: agotado ? "#ef4444" : critico ? "#d97706" : "#10b981" }}>{Math.max(0, disponibles).toLocaleString()}</span></div>
                           <div><span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: 2 }}>VENCIMIENTO</span><span style={{ fontSize: 14, fontWeight: 800, color: "#475569" }}>{seq.vencimiento}</span></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafc", padding: "16px 24px", borderRadius: 20, minWidth: 280 }}>
                      <div style={{ flex: 1 }}>
                        <label className="label" style={{ fontSize: 10, color: "#94a3b8" }}>AJUSTAR LÍMITE</label>
                        <input className="input" type="number" style={{ width: "100%", height: 44, borderRadius: 12, fontWeight: 900, fontSize: 14 }}
                          value={seq.secuencia_fin}
                          onChange={(e) => setSecuencias((prev) => prev.map((s) => s.id === seq.id ? { ...s, secuencia_fin: parseInt(e.target.value) || s.secuencia_fin } : s))} />
                      </div>
                      <button id={`guardar-ncf-${seq.id}`} className="btn btn-primary" onClick={() => actualizar(seq)} disabled={guardando === seq.id}
                        style={{ height: 44, width: 44, padding: 0, borderRadius: 12 }}>
                        {guardando === seq.id ? <RefreshCw className="animate-spin" size={18} /> : <FileCheck size={20} />}
                      </button>
                    </div>
                </div>
              );
            })}
          </div>
        </div>

        {modal === "nuevo" && (
           <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: 500 }}>
                 <div className="modal-header" style={{ marginBottom: 32 }}>
                    <div>
                      <h2 style={{ fontSize: 24, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>Nuevo Lote Fiscal</h2>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>AUTORIZACIÓN DGII</p>
                    </div>
                    <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={24} /></button>
                 </div>

                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                       <label className="label">TIPO DE COMPROBANTE</label>
                       <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, prefix: e.target.value })} style={{ height: 56 }}>
                          {Object.entries(NCF_NOMBRES).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                       </select>
                    </div>
                    <div><label className="label">PREFIJO</label><input className="input" value={form.prefix} disabled style={{ height: 56, background: "#f8fafc" }} /></div>
                    <div><label className="label">VENCIMIENTO</label><input className="input" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} style={{ height: 56 }} /></div>
                    <div><label className="label">INICIO</label><input className="input" type="number" value={form.secuencia_actual} onChange={(e) => setForm({ ...form, secuencia_actual: parseInt(e.target.value) || 1 })} style={{ height: 56 }} /></div>
                    <div><label className="label">FIN</label><input className="input" type="number" value={form.secuencia_fin} onChange={(e) => setForm({ ...form, secuencia_fin: parseInt(e.target.value) || 100 })} style={{ height: 56 }} /></div>
                 </div>

                 <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ flex: 1, height: 56 }}>CANCELAR</button>
                    <button className="btn btn-primary hover-lift" onClick={crear} disabled={Boolean(guardando)} style={{ flex: 2, height: 56 }}>
                       {guardando ? "GUARDANDO..." : "REGISTRAR LOTE"}
                    </button>
                 </div>
              </div>
           </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 40 }}>
           <div className="card" style={{ padding: 28, borderLeft: "4px solid var(--primary)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                 <div style={{ width: 32, height: 32, background: "rgba(99, 102, 241, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <FileCheck size={18} color="var(--primary)" />
                 </div>
                 <h4 style={{ fontWeight: 950, fontSize: 14, color: "#0f172a", letterSpacing: "-0.02em" }}>VALIDACIÓN DGII</h4>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontWeight: 600 }}>
                Las secuencias NCF son autorizadas estrictamente por la DGII. Asegúrate de que el prefijo y rango coincidan con tu certificación legal vigente.
              </p>
           </div>
           
           <div className="card" style={{ padding: 28, borderLeft: "4px solid var(--success)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                 <div style={{ width: 32, height: 32, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <Hash size={18} color="var(--success)" />
                 </div>
                 <h4 style={{ fontWeight: 950, fontSize: 14, color: "#0f172a", letterSpacing: "-0.02em" }}>BLOQUEO PREVENTIVO</h4>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontWeight: 600 }}>
                El sistema monitoriza el consumo de folios en tiempo real y bloqueará la facturación cuando se alcance el límite para evitar discrepancias fiscales.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
