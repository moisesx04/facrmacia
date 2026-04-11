"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, TrendingUp, DollarSign, FileText, Percent } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Resumen {
  total_facturas: number;
  total_ventas: number;
  total_cobrado: number;
  cuentas_por_cobrar: number;
  utilidad_bruta: number;
  total_descuentos: number;
  por_metodo_pago: Record<string, number>;
}

export default function ReportesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "admin") router.push("/dashboard");
  }, [session, router]);

  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch(`/api/reportes?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    setResumen(data);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function exportarCSV() {
    const res = await fetch(`/api/reportes?desde=${desde}&hasta=${hasta}&formato=csv`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_${desde}_${hasta}.csv`;
    a.click();
  }

  const METODO_ICONS: Record<string, string> = { efectivo: "💵", tarjeta: "💳", transferencia: "🏦", credito: "📋" };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Análisis de Negocio</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>MÉTRICAS Y REPORTES DE RENDIMIENTO</p>
        </div>
        <button id="btn-exportar-csv" className="btn btn-ghost" onClick={exportarCSV} style={{ height: 56, borderRadius: 16, border: "2px solid #eff6ff" }}>
          <Download size={18} /> EXPORTAR CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 32, marginBottom: 32, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>FECHA INICIAL</label>
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} 
            style={{ width: 180, height: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc", fontWeight: 700 }} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>FECHA FINAL</label>
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} 
            style={{ width: 180, height: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc", fontWeight: 700 }} />
        </div>
        <button id="btn-generar-reporte" className="btn btn-primary" onClick={cargar} disabled={loading} style={{ height: 56, borderRadius: 16, padding: "0 32px" }}>
          <BarChart3 size={18} /> {loading ? "PROCESANDO..." : "GENERAR REPORTE"}
        </button>
      </div>

      {resumen && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 40 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ width: 48, height: 48, background: "#f0fdf4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <DollarSign size={24} color="#10b981" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                RD${resumen.total_cobrado?.toLocaleString() || "0"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ingreso Real (Cobrado)</div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ width: 48, height: 48, background: "#f0f9ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <TrendingUp size={24} color="#0ea5e9" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                RD${resumen.utilidad_bruta?.toLocaleString() || "0"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Utilidad Bruta (Ganancia)</div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ width: 48, height: 48, background: "#f5f3ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <FileText size={24} color="#6366f1" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{resumen.total_facturas}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Comprobantes Emitidos</div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ width: 48, height: 48, background: "#fffbeb", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <TrendingUp size={24} color="#f59e0b" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                RD${resumen.cuentas_por_cobrar?.toLocaleString() || "0"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Cuentas X Cobrar (Fiao)</div>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", gap: 32 }}>
            {/* Por método de pago */}
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 32 }}>Desglose por Método de Pago</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {Object.entries(resumen.por_metodo_pago || {}).map(([metodo, monto]) => {
                  const pct = resumen.total_ventas > 0 ? (monto / resumen.total_ventas) * 100 : 0;
                  const color = metodo === "efectivo" ? "#10b981" : metodo === "tarjeta" ? "#6366f1" : metodo === "transferencia" ? "#3b82f6" : "#f59e0b";
                  return (
                    <div key={metodo}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 20 }}>{METODO_ICONS[metodo]}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", marginLeft: 10 }}>{metodo}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>RD${Number(monto).toLocaleString()}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{pct.toFixed(1)}% DEL TOTAL</div>
                        </div>
                      </div>
                      <div style={{ height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(to right, ${color}, #fff)`, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumen Informativo */}
            <div className="card" style={{ padding: 32, background: "#f8fafc" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", marginBottom: 24 }}>Información del Período</h3>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: 14 }}>
                Este reporte comprende el intervalo del **{format(new Date(desde), "dd 'de' MMMM", { locale: es })}** al **{format(new Date(hasta), "dd 'de' MMMM", { locale: es })}**.
                <br /><br />
                Durante este tiempo se han procesado **{resumen.total_facturas}** transacciones legítimas.
              </p>
              {(() => {
                const d1 = new Date(desde);
                const d2 = new Date(hasta);
                const dias = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);
                const promedio = resumen.total_ventas / dias;
                return (
                  <div style={{ marginTop: 32, padding: 20, background: "white", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.05em" }}>PROMEDIO DIARIO (En el período)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)" }}>RD${promedio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}>Basado en {dias} {dias === 1 ? "día" : "días"} seleccionados</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
