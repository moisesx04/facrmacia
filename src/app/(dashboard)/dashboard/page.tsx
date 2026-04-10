"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  FileText,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  LayoutDashboard,
  CheckCircle,
  Zap,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Stats {
  ventasHoy: number;
  totalHoy: number;
  productosStockBajo: number;
  facturasPendientes: number;
  totalMes: number;
  totalFacturas: number;
  totalProductos?: number;
}

interface ProductoAlerta {
  id: string;
  nombre: string;
  codigo: string;
  stock_actual: number;
  stock_minimo: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";
  const [stats, setStats] = useState<Stats | null>(null);
  const [alertas, setAlertas] = useState<ProductoAlerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

        const [resHoy, resMes, resAlertas, resTotal] = await Promise.all([
          fetch(`/api/reportes?desde=${hoy}&hasta=${hoy}`).then((r) => r.json()),
          fetch(`/api/reportes?desde=${inicioMes}&hasta=${hoy}`).then((r) => r.json()),
          fetch("/api/productos?bajo_stock=true&limit=10").then((r) => r.json()),
          fetch("/api/productos?limit=1").then((r) => r.json()),
        ]);

        setStats({
          ventasHoy: resHoy.total_facturas || 0,
          totalHoy: resHoy.total_ventas || 0,
          productosStockBajo: Array.isArray(resAlertas) ? resAlertas.length : 0,
          facturasPendientes: 0,
          totalMes: resMes.total_ventas || 0,
          totalFacturas: resMes.total_facturas || 0,
          totalProductos: resTotal.count || 0
        });
        setAlertas(Array.isArray(resAlertas) ? resAlertas.slice(0, 8) : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (isAdmin) loadData();
    else setLoading(false);
  }, [isAdmin]);

  return (
    <div className="fade-in" style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 100 }}>
      {/* HEADER DASHBOARD V7 */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="page-title">Panel de Control</h1>
          <p className="page-subtitle">RADIANT ELITE V7.0 • MODO CLARO</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button className="btn btn-ghost hover-lift" onClick={() => router.push("/reportes")} style={{ height: 56, padding: "0 24px" }}>
            <FileText size={20} /> REPORTES
          </button>
          <button className="btn btn-primary hover-lift" onClick={() => router.push("/ventas")} style={{ height: 56, padding: "0 32px" }}>
             <ShoppingCart size={20} /> VENTA NUEVA
          </button>
        </div>
      </div>

      {/* METRICAS V7.0 HERO */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 56 }}>
        <StatCard loading={loading} icon={<TrendingUp size={28} />} value={`RD$${stats?.totalHoy.toLocaleString() || "0"}`} label="Ventas de Hoy" color="#6366f1" />
        <StatCard loading={loading} icon={<ShoppingBag size={28} />} value={stats?.ventasHoy || "0"} label="Facturas Emitidas" color="#10b981" />
        <StatCard loading={loading} icon={<Package size={28} />} value={stats?.totalProductos || "0"} label="Catálogo Total" color="#a855f7" />
        <StatCard loading={loading} icon={<AlertTriangle size={28} />} value={stats?.productosStockBajo || "0"} label="Alertas de Stock" color="#ef4444" alert={Boolean(stats?.productosStockBajo && stats.productosStockBajo > 0)} />
      </div>

      {/* SECCION CENTRAL RADIANT */}
      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "minmax(0, 1fr) minmax(0, 1.8fr)" : "1fr", gap: 32 }}>
        {isAdmin && (
          <div className="glass" style={{ padding: 32, borderRadius: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
              <div style={{ width: 44, height: 44, background: "rgba(239, 68, 68, 0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={20} color="#ef4444" /></div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>Reabastecimiento</h3>
                <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>STOCK CRÍTICO DETECTADO</p>
              </div>
              <span style={{ marginLeft: "auto", background: "#ef4444", color: "white", padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 950 }}>{alertas.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alertas.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontWeight: 800, background: "#f8fafc", borderRadius: 24 }}>SISTEMA AL DÍA</div>
              ) : alertas.map((p) => (
                <div key={p.id} className="hover-lift" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "white", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{p.nombre.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 800 }}>REF: {p.codigo}</div>
                  </div>
                  <div style={{ textAlign: "right", background: "#fee2e2", color: "#991b1b", padding: "6px 12px", borderRadius: 10, fontSize: 13, fontWeight: 950 }}>
                    {p.stock_actual} Uds.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass" style={{ padding: 32, borderRadius: 32 }}>
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>Servicios del Sistema</h3>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>ACCESOS RÁPIDOS V7.0 ELITE</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { href: "/ventas", icon: <ShoppingCart size={24} />, label: "Terminal POS", color: "#6366f1", desc: "Venta Directa" },
              { href: "/inventario", icon: <Package size={24} />, label: "Catálogo", color: "#a855f7", desc: "Gestionar Stock" },
              { href: "/clientes", icon: <Users size={24} />, label: "Pacientes", color: "#10b981", desc: "Base de Clientes" },
              { href: "/facturas", icon: <FileText size={24} />, label: "Historial", color: "#f59e0b", desc: "Facturas Emitidas" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} className="hover-lift" style={{
                display: "flex", alignItems: "center", gap: 16, padding: "24px", textDecoration: "none",
                background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 24, boxShadow: "0 6px 12px -2px rgba(0,0,0,0.03)"
              }}>
                <div style={{ width: 48, height: 48, background: `${item.color}08`, color: item.color, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </div>
                <div>
                   <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>{item.label}</div>
                   <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
          
          <div style={{ marginTop: 40, padding: "32px", borderRadius: 28, background: "linear-gradient(135deg, #0f172a, #1e293b)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.2em" }}>SISTEMA PROFESIONAL</div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>FarmaSystem Radiant V7.0</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(16, 185, 129, 0.15)", padding: "10px 20px", borderRadius: 14, border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
                <span style={{ fontSize: 11, fontWeight: 950, color: "#10b981" }}>ONLINE</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ loading, icon, value, label, color, alert }: any) {
  return (
    <div className="glass hover-lift" style={{ 
      padding: 32, borderRadius: 32, background: "white",
      borderLeft: alert ? `8px solid ${color}` : "1px solid #f1f5f9"
    }}>
      <div style={{ position: "relative" }}>
        <div style={{ 
          width: 52, height: 52, borderRadius: 14, background: `${color}08`, color: color,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
          border: "1px solid rgba(0,0,0,0.02)"
        }}>
          {icon}
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 40, width: "60%", borderRadius: 8 }} />
        ) : (
          <div style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
            {value}
          </div>
        )}
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      </div>
    </div>
  );
}
