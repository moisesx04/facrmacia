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
  Zap
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

  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="fade-in" style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 100 }}>
      {/* HEADER DASHBOARD */}
      <div className="page-header" style={{ marginBottom: 64 }}>
        <div>
          <h1 className="page-title">Centro de Comando</h1>
          <p className="page-subtitle">SISTEMA ULTRA-VIBRANTE V6.0</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button className="btn btn-ghost hover-lift" onClick={() => router.push("/reportes")} style={{ height: 60, padding: "0 24px" }}>
            <TrendingUp size={22} /> REPORTES
          </button>
          <button className="btn btn-primary hover-lift" onClick={() => router.push("/ventas")} style={{ height: 60, padding: "0 32px" }}>
            <Zap size={22} /> VENTA RÁPIDA
          </button>
        </div>
      </div>

      {/* METRICAS V6.0 HERO GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, marginBottom: 64 }}>
        <StatCard loading={loading} icon={<DollarSign size={32} />} value={`RD$${stats?.totalHoy.toLocaleString() || "0"}`} label="Ventas Hoy" color="#6366f1" gradient="linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))" />
        <StatCard loading={loading} icon={<ShoppingBag size={32} />} value={stats?.ventasHoy || "0"} label="Facturas Hoy" color="#10b981" gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))" />
        <StatCard loading={loading} icon={<Package size={32} />} value={stats?.totalProductos || "0"} label="Inventario Total" color="#a855f7" gradient="linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))" />
        <StatCard loading={loading} icon={<AlertTriangle size={32} />} value={stats?.productosStockBajo || "0"} label="Stock Crítico" color="#ef4444" gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))" alert={Boolean(stats?.productosStockBajo && stats.productosStockBajo > 0)} />
      </div>

      {/* SECCION CENTRAL */}
      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "minmax(0, 1fr) minmax(0, 1.8fr)" : "1fr", gap: 32 }}>
        {isAdmin && (
          <div className="glass" style={{ padding: 40, borderRadius: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
              <div style={{ width: 56, height: 56, background: "rgba(239, 68, 68, 0.2)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={28} color="#ef4444" /></div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: "white", letterSpacing: "-0.03em" }}>Alertas Urgentes</h3>
                <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>REPONER INMEDIATAMENTE</p>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {alertas.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#64748b", fontWeight: 900, background: "rgba(255,255,255,0.02)", borderRadius: 32 }}>LOGÍSTICA AL DÍA</div>
              ) : alertas.map((p) => (
                <div key={p.id} className="hover-lift" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", background: "rgba(30, 41, 59, 0.4)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 950, color: "white" }}>{p.nombre.toUpperCase()}</div>
                    <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 900, marginTop: 4 }}>SKU: {p.codigo}</div>
                  </div>
                  <div style={{ textAlign: "right", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 950 }}>
                    {p.stock_actual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass" style={{ padding: 40, borderRadius: 40 }}>
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 20, fontWeight: 950, color: "white", letterSpacing: "-0.03em" }}>Accesos Inteligentes V6</h3>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>OPERACIONES DE ALTA VELOCIDAD</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              { href: "/ventas", icon: <ShoppingCart size={32} />, label: "TERMINAL POS", color: "#6366f1", desc: "Punto de Venta" },
              { href: "/inventario", icon: <Package size={32} />, label: "INVENTARIO", color: "#a855f7", desc: "Gestión y Stock" },
              { href: "/clientes", icon: <Users size={32} />, label: "CLIENTES", color: "#10b981", desc: "Base de Datos" },
              { href: "/facturas", icon: <FileText size={32} />, label: "HISTORIAL", color: "#f59e0b", desc: "Registro Fiscal" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} className="hover-lift" style={{
                display: "flex", alignItems: "center", gap: 20, padding: "32px", textDecoration: "none",
                background: "rgba(30, 41, 59, 0.6)", borderRadius: 32, border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ width: 64, height: 64, background: `${item.color}20`, color: item.color, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))" }}>
                  {item.icon}
                </div>
                <div>
                   <div style={{ fontSize: 15, fontWeight: 950, color: "white" }}>{item.label}</div>
                   <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="glass-dark" style={{ marginTop: 48, padding: "40px", borderRadius: 40, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.2em" }}>SISTEMA PRO</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "white" }}>V6.0 Ultra-Vibrant</div>
              </div>
              <div style={{ width: 64, height: 64, background: "rgba(16, 185, 129, 0.15)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <Zap size={32} color="#10b981" />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ loading, icon, value, label, color, gradient, alert }: any) {
  return (
    <div className="glass hover-lift" style={{ 
      padding: 48, borderRadius: 48, position: "relative", overflow: "hidden", 
      background: gradient || "rgba(30, 41, 59, 0.7)",
      border: alert ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.15)"
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ 
          width: 72, height: 72, borderRadius: 24, background: "rgba(255, 255, 255, 0.1)", color: color,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32,
          boxShadow: `0 10px 30px rgba(0,0,0,0.4)`, border: "1px solid rgba(255,255,255,0.1)"
        }}>
          {icon}
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 60, width: "70%", borderRadius: 16 }} />
        ) : (
          <div style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 950, color: "white", letterSpacing: "-0.06em", lineHeight: 1, marginBottom: 8, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
            {value}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.2em" }}>{label}</div>
      </div>
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: color, opacity: 0.1, filter: "blur(60px)", borderRadius: "50%" }} />
    </div>
  );
}
