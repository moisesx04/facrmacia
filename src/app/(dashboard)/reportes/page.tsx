"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, TrendingUp, DollarSign, FileText, Percent } from "lucide-react";

interface Resumen {
  total_facturas: number;
  total_ventas: number;
  total_itbis: number;
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes de Ventas</h1>
          <p className="page-subtitle">Análisis financiero por período</p>
        </div>
        <button id="btn-exportar-csv" className="btn btn-primary" onClick={exportarCSV}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="glass" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label className="label">Desde</label>
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 160 }} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 160 }} />
        </div>
        <button id="btn-generar-reporte" className="btn btn-primary" onClick={cargar} disabled={loading}>
          <BarChart3 size={16} /> {loading ? "Calculando..." : "Generar Reporte"}
        </button>
      </div>

      {resumen && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><DollarSign size={22} color="#10b981" /></div>
              <div className="stat-value" style={{ color: "#10b981" }}>
                RD${resumen.total_ventas.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </div>
              <div className="stat-label">Total Ventas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(99,102,241,0.15)" }}><FileText size={22} color="#6366f1" /></div>
              <div className="stat-value" style={{ color: "#6366f1" }}>{resumen.total_facturas}</div>
              <div className="stat-label">Total Facturas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Percent size={22} color="#f59e0b" /></div>
              <div className="stat-value" style={{ color: "#f59e0b" }}>
                RD${resumen.total_itbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </div>
              <div className="stat-label">ITBIS Recaudado</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}><TrendingUp size={22} color="#3b82f6" /></div>
              <div className="stat-value" style={{ color: "#3b82f6" }}>
                RD${resumen.total_facturas > 0 ? (resumen.total_ventas / resumen.total_facturas).toFixed(2) : "0.00"}
              </div>
              <div className="stat-label">Ticket Promedio</div>
            </div>
          </div>

          {/* Por método de pago */}
          <div className="glass" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Ventas por Método de Pago</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {Object.entries(resumen.por_metodo_pago || {}).map(([metodo, monto]) => {
                const pct = resumen.total_ventas > 0 ? (monto / resumen.total_ventas) * 100 : 0;
                return (
                  <div key={metodo} style={{ padding: 16, background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{METODO_ICONS[metodo] || "💰"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize", marginBottom: 4 }}>{metodo}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>
                      RD${Number(monto).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="stock-bar">
                        <div className="stock-bar-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
