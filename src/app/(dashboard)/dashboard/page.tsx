"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, ShoppingBag, AlertTriangle, FileText, DollarSign, Package } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  ventasHoy: number;
  totalHoy: number;
  productosStockBajo: number;
  facturasPendientes: number;
  totalMes: number;
  totalFacturas: number;
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
  const isAdmin = session?.user?.role === "admin";
  const [stats, setStats] = useState<Stats | null>(null);
  const [alertas, setAlertas] = useState<ProductoAlerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

        const [resHoy, resMes, resAlertas] = await Promise.all([
          fetch(`/api/reportes?desde=${hoy}&hasta=${hoy}`).then((r) => r.json()),
          fetch(`/api/reportes?desde=${inicioMes}&hasta=${hoy}`).then((r) => r.json()),
          fetch("/api/productos?bajo_stock=true&limit=10").then((r) => r.json()),
        ]);

        setStats({
          ventasHoy: resHoy.total_facturas || 0,
          totalHoy: resHoy.total_ventas || 0,
          productosStockBajo: Array.isArray(resAlertas) ? resAlertas.length : 0,
          facturasPendientes: 0,
          totalMes: resMes.total_ventas || 0,
          totalFacturas: resMes.total_facturas || 0,
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
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ textTransform: "capitalize" }}>{today}</p>
        </div>
        <a href="/ventas" className="btn btn-primary">
          <ShoppingBag size={16} /> Nueva Venta
        </a>
      </div>

      {/* KPI Cards */}
      {isAdmin ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          <StatCard loading={loading} icon={<DollarSign size={22} color="#10b981" />} iconBg="rgba(16,185,129,0.15)"
            value={`RD$${stats?.totalHoy.toLocaleString("es-DO", { minimumFractionDigits: 2 }) || "0.00"}`}
            label="Ventas de Hoy" accent="#10b981" />
          <StatCard loading={loading} icon={<FileText size={22} color="#6366f1" />} iconBg="rgba(99,102,241,0.15)"
            value={String(stats?.ventasHoy || 0)} label="Facturas Hoy" accent="#6366f1" />
          <StatCard loading={loading} icon={<TrendingUp size={22} color="#3b82f6" />} iconBg="rgba(59,130,246,0.15)"
            value={`RD$${stats?.totalMes.toLocaleString("es-DO", { minimumFractionDigits: 2 }) || "0.00"}`}
            label="Ventas del Mes" accent="#3b82f6" />
          <StatCard loading={loading} icon={<AlertTriangle size={22} color="#f59e0b" />} iconBg="rgba(245,158,11,0.15)"
            value={String(stats?.productosStockBajo || 0)} label="Stock Bajo" accent="#f59e0b"
            alert={stats?.productosStockBajo ? stats.productosStockBajo > 0 : false} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(99,102,241,0.15)" }}><ShoppingBag size={22} color="#6366f1" /></div>
            <div className="stat-value">Bienvenido</div>
            <div className="stat-label">Sistema listo para operar</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 24 }}>
        {/* Alertas de Stock */}
        {isAdmin && alertas.length > 0 && (
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Alertas de Stock</h3>
              <span className="badge badge-warning" style={{ marginLeft: "auto" }}>{alertas.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alertas.map((p) => {
                const pct = Math.min((p.stock_actual / Math.max(p.stock_minimo * 2, 1)) * 100, 100);
                return (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</span>
                      <span className={`badge ${p.stock_actual === 0 ? "badge-danger" : "badge-warning"}`}>
                        {p.stock_actual === 0 ? "Sin stock" : `${p.stock_actual} uds`}
                      </span>
                    </div>
                    <div className="stock-bar">
                      <div className="stock-bar-fill" style={{
                        width: `${pct}%`,
                        background: p.stock_actual === 0 ? "var(--danger)" : p.stock_actual <= p.stock_minimo ? "var(--warning)" : "var(--success)"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Accesos Rápidos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { href: "/ventas", icon: "🛒", label: "Nueva Venta", color: "var(--accent)" },
              { href: "/inventario", icon: "📦", label: "Inventario", color: "var(--success)" },
              { href: "/clientes", icon: "👥", label: "Clientes", color: "var(--info)" },
              { href: "/facturas", icon: "🧾", label: "Facturas", color: "var(--warning)" },
            ].map((item) => (
              <a key={item.href} href={item.href} style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "20px 16px", borderRadius: "var(--radius)", textDecoration: "none",
                background: "var(--bg-card)", border: "1px solid var(--border)", gap: 10,
                transition: "var(--transition)",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = item.color; (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; }}
              >
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ loading, icon, iconBg, value, label, accent, alert }: {
  loading: boolean; icon: React.ReactNode; iconBg: string;
  value: string; label: string; accent: string; alert?: boolean;
}) {
  return (
    <div className="stat-card" style={{ borderColor: alert ? "rgba(245,158,11,0.3)" : undefined }}>
      <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
      {loading ? (
        <>
          <div className="skeleton" style={{ height: 32, width: "70%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: "50%" }} />
        </>
      ) : (
        <>
          <div className="stat-value" style={{ color: accent }}>{value}</div>
          <div className="stat-label">{label}</div>
        </>
      )}
    </div>
  );
}
