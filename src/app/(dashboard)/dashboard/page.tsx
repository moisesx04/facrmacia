"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TrendingUp, ShoppingBag, AlertTriangle, FileText, Package, ShoppingCart, Users, Zap, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Stats {
  ventasHoy: number;
  totalHoy: number;
  productosStockBajo: number;
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
    <div style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 60, paddingTop: 40 }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">General</h1>
          <p className="page-subtitle">Panel de control de la farmacia</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-outline" onClick={() => router.push("/reportes")}>
            <FileText size={16} /> Ver Reportes
          </button>
          <button className="btn btn-primary" onClick={() => router.push("/ventas")}>
             <Plus size={16} /> Nueva Venta
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <MetricCard title="Ventas Hoy" value={`RD$${stats?.totalHoy.toLocaleString() || "0"}`} loading={loading} />
        <MetricCard title="Facturas Hoy" value={stats?.ventasHoy || "0"} loading={loading} />
        <MetricCard title="Productos en Catálogo" value={stats?.totalProductos || "0"} loading={loading} />
        <MetricCard title="Alertas de Stock" value={stats?.productosStockBajo || "0"} loading={loading} isWarning={Boolean(stats?.productosStockBajo && stats.productosStockBajo > 0)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "350px 1fr" : "1fr", gap: 24 }}>
        {/* Alertas */}
        {isAdmin && (
          <div className="card" style={{ padding: 24, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Stock Crítico</h3>
              {alertas.length > 0 && <span className="badge badge-danger">{alertas.length}</span>}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alertas.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Todo al día.</div>
              ) : alertas.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.codigo}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>
                    {p.stock_actual} uds
                  </div>
                </div>
              ))}
            </div>
            {alertas.length > 0 && (
               <button className="btn btn-outline" style={{ width: "100%", marginTop: 16 }} onClick={() => router.push("/inventario")}>
                 Gestionar Inventario
               </button>
            )}
          </div>
        )}

        {/* Accesos */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Accesos Rápidos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <ShortcutCard href="/ventas" icon={<ShoppingCart size={20} />} title="Terminal POS" desc="Venta directa en caja" />
            <ShortcutCard href="/inventario" icon={<Package size={20} />} title="Catálogo" desc="Administrar existencias" />
            <ShortcutCard href="/clientes" icon={<Users size={20} />} title="Clientes" desc="Directorio de clientes" />
            <ShortcutCard href="/facturas" icon={<FileText size={20} />} title="Facturación" desc="Historial y comprobantes" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, loading, isWarning }: any) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, marginBottom: 8 }}>{title}</div>
      {loading ? (
        <div style={{ height: 28, width: 80, background: "var(--border)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
      ) : (
        <div style={{ fontSize: 24, fontWeight: 600, color: isWarning ? "var(--danger)" : "var(--text-main)" }}>
          {value}
        </div>
      )}
    </div>
  );
}

function ShortcutCard({ href, icon, title, desc }: any) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, border: "1px solid var(--border)", borderRadius: 8, textDecoration: "none", color: "inherit", transition: "all 0.15s" }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--text-main)")}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f8fafc", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-main)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
      </div>
    </Link>
  );
}

function Plus({size}: {size: number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> }
