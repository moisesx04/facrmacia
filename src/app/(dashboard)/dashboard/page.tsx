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
        const inicioMes = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        )
          .toISOString()
          .split("T")[0];

        const [resHoy, resMes, resAlertas] = await Promise.all([
          fetch(`/api/reportes?desde=${hoy}&hasta=${hoy}`).then((r) =>
            r.json(),
          ),
          fetch(`/api/reportes?desde=${inicioMes}&hasta=${hoy}`).then((r) =>
            r.json(),
          ),
          fetch("/api/productos?bajo_stock=true&limit=10").then((r) =>
            r.json(),
          ),
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
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Dashboard Central</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>INDICADORES CLAVE DE RENDIMIENTO (KPI)</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button className="btn btn-primary" onClick={() => router.push("/ventas")} style={{ height: 44, padding: "0 20px", borderRadius: 14, display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
            <ShoppingBag size={18} /> REALIZAR VENTA
          </button>
        </div>
      </div>

      {isAdmin ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, marginBottom: 48 }}>
          <StatCard loading={loading} 
            icon={<DollarSign size={26} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #10b981, #059669)"
            value={`RD$${stats?.totalHoy.toLocaleString("es-DO")}`}
            label="Ingresos Hoy" 
            accent="#10b981" />
          
          <StatCard loading={loading} 
            icon={<FileText size={26} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #6366f1, #4f46e5)"
            value={stats?.ventasHoy.toString() || "0"} 
            label="Comprobantes" 
            accent="#6366f1" />

          <StatCard loading={loading} 
            icon={<TrendingUp size={26} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #3b82f6, #2563eb)"
            value={`RD$${stats?.totalMes.toLocaleString("es-DO")}`}
            label="Meta del Mes" 
            accent="#3b82f6" />

          <StatCard loading={loading} 
            icon={<AlertTriangle size={26} color="#ffffff" />} 
            iconBg="linear-gradient(135deg, #f59e0b, #d97706)"
            value={stats?.productosStockBajo.toString() || "0"} 
            label="Existencias Bajas" 
            accent="#f59e0b"
            alert={Boolean(stats?.productosStockBajo && stats.productosStockBajo > 0)} />
        </div>
      ) : (
        <div className="glass" style={{ padding: 48, borderRadius: 32, marginBottom: 48, background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)" }}>
           <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div style={{ width: 80, height: 80, background: "#6366f1", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(99,102,241,0.2)" }}>
                 <LayoutDashboard size={40} color="white" />
              </div>
              <div>
                 <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Terminal Activa</h2>
                 <p style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>SISTEMA LISTO PARA OPERACIONES DE VENTA Y CONSULTA</p>
              </div>
           </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1.6fr" : "1fr", gap: 40 }}>
        {isAdmin && (
          <div className="glass" style={{ padding: 40, borderRadius: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
              <div style={{ padding: 12, background: "#fef2f2", borderRadius: 14 }}><AlertTriangle size={24} color="#ef4444" /></div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>Stock Crítico</h3>
              <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", padding: "6px 16px", borderRadius: 12, fontSize: 13, fontWeight: 900 }}>{alertas.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {alertas.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>TODO EN ORDEN</div>
              ) : alertas.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", background: "#f8fafc", borderRadius: 20, border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{p.nombre.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>CÓDIGO: {p.codigo}</div>
                  </div>
                  <div style={{ textAlign: "right", background: "#fee2e2", color: "#991b1b", padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 900, border: "1px solid #fecaca" }}>
                    {p.stock_actual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass" style={{ padding: 40, borderRadius: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 32, letterSpacing: "-0.02em" }}>Accesos Directos Premium</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
            {[
              { href: "/ventas", icon: <ShoppingCart size={32} />, label: "PUNTO VENTA", bg: "#f0fdf4", color: "#10b981", accent: "EMERALD" },
              { href: "/inventario", icon: <Package size={32} />, label: "ALMACÉN", bg: "#fffbeb", color: "#f59e0b", accent: "AMBER" },
              { href: "/clientes", icon: <Users size={32} />, label: "PACIENTES", bg: "#fdf2f7", color: "#ec4899", accent: "ROSE" },
              { href: "/facturas", icon: <FileText size={32} />, label: "REPORTES", bg: "#eff6ff", color: "#3b82f6", accent: "SKY" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} style={{
                display: "flex", flexDirection: "column", gap: 20, padding: "40px 24px", textDecoration: "none",
                background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 28, transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                alignItems: "center"
              }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.transform = "translateY(-12px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; e.currentTarget.style.borderColor = item.color; }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#f1f5f9"; }}
              >
                <div style={{ width: 60, height: 60, background: item.bg, color: item.color, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 12px -3px ${item.color}33` }}>
                  {item.icon}
                </div>
                <div style={{ textAlign: "center" }}>
                   <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", letterSpacing: "0.05em" }}>{item.label}</div>
                   <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", marginTop: 4 }}>ACCESO {item.accent}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  loading,
  icon,
  iconBg,
  value,
  label,
  accent,
  alert,
}: {
  loading: boolean;
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  accent: string;
  alert?: boolean;
}) {
  return (
    <div
      className="stat-card"
      style={{ borderColor: alert ? "rgba(245,158,11,0.3)" : undefined }}
    >
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      {loading ? (
        <>
          <div
            className="skeleton"
            style={{ height: 32, width: "70%", marginBottom: 8 }}
          />
          <div className="skeleton" style={{ height: 14, width: "50%" }} />
        </>
      ) : (
        <>
          <div className="stat-value" style={{ color: accent }}>
            {value}
          </div>
          <div className="stat-label">{label}</div>
        </>
      )}
    </div>
  );
}
