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
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Panel de Control</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>GESTIÓN INTEGRAL DE OPERACIONES</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/ventas" className="btn btn-primary btn-lg" style={{ 
            borderRadius: 18, padding: "0 32px", fontSize: 16, fontWeight: 800,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)"
          }}>
            <ShoppingBag size={20} /> NUEVA VENTA
          </a>
        </div>
      </div>

      {isAdmin ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginBottom: 40 }}>
          <StatCard loading={loading} 
            icon={<DollarSign size={24} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #10b981, #059669)"
            value={`RD$${stats?.totalHoy.toLocaleString("es-DO")}`}
            label="Ventas de Hoy" 
            accent="#10b981" />
          
          <StatCard loading={loading} 
            icon={<FileText size={24} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #6366f1, #4f46e5)"
            value={stats?.ventasHoy.toString() || "0"} 
            label="Facturas Generadas" 
            accent="#6366f1" />

          <StatCard loading={loading} 
            icon={<TrendingUp size={24} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #3b82f6, #2563eb)"
            value={`RD$${stats?.totalMes.toLocaleString("es-DO")}`}
            label="Ingresos del Mes" 
            accent="#3b82f6" />

          <StatCard loading={loading} 
            icon={<AlertTriangle size={24} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #f59e0b, #d97706)"
            value={stats?.productosStockBajo.toString() || "0"} 
            label="Alertas de Inventario" 
            accent="#f59e0b"
            alert={stats?.productosStockBajo ? stats.productosStockBajo > 0 : false} />
        </div>
      ) : (
        <div style={{ padding: 40, background: "white", borderRadius: 24, boxShadow: "var(--shadow-lg)", marginBottom: 40, border: "1px solid rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 64, height: 64, background: "#f0f9ff", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={32} color="#0ea5e9" />
            </div>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Sistema en Línea</h2>
              <p style={{ color: "#64748b", fontWeight: 500 }}>Operador autenticado y listo para facturar.</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1.5fr" : "1fr", gap: 32 }}>
        {/* Alertas con mejor diseño */}
        {isAdmin && alertas.length > 0 && (
          <div className="glass" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ padding: 10, background: "#fef2f2", borderRadius: 12 }}><AlertTriangle size={20} color="#ef4444" /></div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stock Crítico</h3>
              <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900 }}>{alertas.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {alertas.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: 16, border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>CÓDIGO: {p.codigo}</div>
                  </div>
                  <div style={{ textAlign: "right", background: "#fee2e2", color: "#991b1b", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900 }}>
                    {p.stock_actual} UNID.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accesos rápidos con iconos de colores */}
        <div className="glass" style={{ padding: 32, borderRadius: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 24 }}>Accesos Directos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
            {[
              { href: "/ventas", icon: <ShoppingBag size={32} />, label: "VENDER", bg: "#f0fdf4", color: "#10b981" },
              { href: "/inventario", icon: <Package size={32} />, label: "PRODUCTOS", bg: "#fffbeb", color: "#f59e0b" },
              { href: "/clientes", icon: <Users size={32} />, label: "CLIENTES", bg: "#fdf2f7", color: "#ec4899" },
              { href: "/facturas", icon: <FileText size={32} />, label: "HISTORIAL", bg: "#eff6ff", color: "#3b82f6" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} style={{
                display: "flex", flexDirection: "column", gap: 16, padding: "32px 20px", textDecoration: "none",
                background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 20, transition: "var(--transition)",
                alignItems: "center"
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.borderColor = item.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#f1f5f9"; }}
              >
                <div style={{ width: 64, height: 64, background: item.bg, color: item.color, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", letterSpacing: "0.05em" }}>{item.label}</span>
              </Link>
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
