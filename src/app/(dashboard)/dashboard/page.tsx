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
          <StatCard loading={loading} icon={<DollarSign size={22} color="#ffffff" />} iconBg="#000000"
            value={`RD$${stats?.totalHoy.toLocaleString("es-DO", { minimumFractionDigits: 2 }) || "0.00"}`}
            label="VENTAS DE HOY" accent="#000000" />
          <StatCard loading={loading} icon={<FileText size={22} color="#ffffff" />} iconBg="#000000"
            value={String(stats?.ventasHoy || 0)} label="FACTURAS HOY" accent="#000000" />
          <StatCard loading={loading} icon={<TrendingUp size={22} color="#ffffff" />} iconBg="#000000"
            value={`RD$${stats?.totalMes.toLocaleString("es-DO", { minimumFractionDigits: 2 }) || "0.00"}`}
            label="VENTAS DEL MES" accent="#000000" />
          <StatCard loading={loading} icon={<AlertTriangle size={22} color="#ffffff" />} iconBg="#000000"
            value={String(stats?.productosStockBajo || 0)} label="STOCK BAJO" accent="#000000"
            alert={stats?.productosStockBajo ? stats.productosStockBajo > 0 : false} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div className="stat-card" style={{ border: "2px solid #000000", background: "#ffffff" }}>
            <div className="stat-icon" style={{ background: "#000000" }}><ShoppingBag size={22} color="#ffffff" /></div>
            <div className="stat-value" style={{ color: "#000000" }}>BIENVENIDO</div>
            <div className="stat-label">SISTEMA LISTO PARA OPERAR</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 24 }}>
        {/* Alertas de Stock */}
        {isAdmin && alertas.length > 0 && (
          <div style={{ padding: 24, border: "2px solid #000000", background: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <AlertTriangle size={20} color="#000000" />
              <h3 style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase" }}>Alertas de Stock</h3>
              <span className="badge badge-warning" style={{ marginLeft: "auto", background: "#000000", color: "#ffffff", border: "1px solid #000000" }}>{alertas.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alertas.map((p) => {
                const pct = Math.min((p.stock_actual / Math.max(p.stock_minimo * 2, 1)) * 100, 100);
                return (
                  <div key={p.id} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{p.nombre}</span>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>
                        {p.stock_actual === 0 ? "AGOTADO" : `${p.stock_actual} UNIDADES`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div style={{ padding: 24, border: "2px solid #000000", background: "#ffffff" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", marginBottom: 20 }}>Accesos Rápidos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { href: "/ventas", icon: "🛒", label: "NUEVA VENTA" },
              { href: "/inventario", icon: "📦", label: "INVENTARIO" },
              { href: "/clientes", icon: "👥", label: "CLIENTES" },
              { href: "/facturas", icon: "🧾", label: "FACTURAS" },
            ].map((item) => (
              <a key={item.href} href={item.href} style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "20px 16px", borderRadius: 0, textDecoration: "none",
                background: "#ffffff", border: "2px solid #e2e8f0", gap: 10,
                transition: "all 0.2s ease",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#000000"; (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
              >
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#000000" }}>{item.label}</span>
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
