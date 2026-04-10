"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Upload, AlertTriangle, Package, Zap, ArrowRight } from "lucide-react";

interface Producto {
  id: string; codigo: string; nombre: string; precio: number; costo: number;
  itbis: number; aplica_itbis: boolean; stock_actual: number; stock_minimo: number; activo: boolean;
  categorias?: { nombre: string };
}

const EMPTY: Partial<Producto> = { codigo: "", nombre: "", precio: 0, costo: 0, itbis: 0.18, aplica_itbis: true, stock_actual: 0, stock_minimo: 5 };

export default function InventarioPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [productos, setProductos] = useState<Producto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"crear" | "editar" | "importar" | null>(null);
  const [form, setForm] = useState<Partial<Producto>>(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ insertados: number; errores: string[] } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState<{ open: boolean; id: string; pass: string; error: string; loading: boolean }>({ open: false, id: "", pass: "", error: "", loading: false });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargar();
    }, 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/productos?q=${encodeURIComponent(busqueda)}&limit=100`);
      const result = await res.json();
      if (result.data) {
        setProductos(result.data);
        setTotalCount(result.count || 0);
      } else {
        setProductos(Array.isArray(result) ? result : []);
        setTotalCount(Array.isArray(result) ? result.length : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  return (
    <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 100 }}>
      {/* HEADER LUMINOSO */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="page-title">Inventario Central</h1>
          <p className="page-subtitle">RADIANT ELITE V7.0 • MODO CLARO</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {isAdmin && (
            <>
              <button className="btn btn-ghost hover-lift" onClick={() => setModal("importar")} style={{ height: 52 }}>
                <Upload size={18} /> IMPORTAR
              </button>
              <button className="btn btn-primary hover-lift" onClick={() => { setForm(EMPTY); setModal("crear"); }} style={{ height: 52, padding: "0 28px" }}>
                <Plus size={20} /> NUEVO PRODUCTO
              </button>
            </>
          )}
        </div>
      </div>

      {/* HERO METRICS V7.0 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
        <div className="glass hover-lift" style={{ padding: 32, borderRadius: 32, borderLeft: "8px solid #6366f1" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 48, height: 48, background: "rgba(99, 102, 241, 0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Package size={24} color="#6366f1" />
             </div>
             <Zap size={18} color="#6366f1" opacity={0.5} />
           </div>
           <div style={{ marginTop: 20 }}>
             <div style={{ fontSize: 40, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}>{totalCount}</div>
             <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Medicamentos en Catálogo</div>
           </div>
        </div>

        <div className="glass hover-lift" style={{ padding: 32, borderRadius: 32, borderLeft: "8px solid #ef4444" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 48, height: 48, background: "rgba(239, 68, 68, 0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <AlertTriangle size={24} color="#ef4444" />
             </div>
           </div>
           <div style={{ marginTop: 20 }}>
             <div style={{ fontSize: 40, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}>{bajoStock.length}</div>
             <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Alertas de Reabastecimiento</div>
           </div>
        </div>

        <div className="glass hover-lift" style={{ padding: 32, borderRadius: 32, borderLeft: "8px solid #10b981" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 48, height: 48, background: "rgba(16, 185, 129, 0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Zap size={24} color="#10b981" />
             </div>
           </div>
           <div style={{ marginTop: 20 }}>
             <div style={{ fontSize: 40, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}>{productos.filter(p => Number(p.precio) > 0).length}</div>
             <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Precios Validados</div>
           </div>
        </div>
      </div>

      {/* SEARCH RADIANT */}
      <div className="glass" style={{ padding: 16, borderRadius: 24, marginBottom: 32 }}>
        <div style={{ position: "relative" }}>
          <Search size={22} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", color: "#6366f1" }} />
          <input className="input" placeholder="Buscar medicina, código o marca..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
            style={{ paddingLeft: 64, height: 60, borderRadius: 18, fontSize: 16, border: "none", background: "#f8fafc" }} />
        </div>
      </div>

      {/* TABLA RADIANT V7.0 */}
      <div className="glass" style={{ borderRadius: 32, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div className="table-container" style={{ padding: "0 16px" }}>
          <table className="table-v7">
            <thead>
              <tr>
                <th>Identificación del Producto</th>
                <th>Valores Comerciales</th>
                <th>Estado de Almacén</th>
                <th style={{ textAlign: "right" }}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}><td colSpan={4} style={{ padding: 12 }}><div className="skeleton" style={{ height: 64, borderRadius: 12 }} /></td></tr>
              )) : productos.map((p) => {
                const agotado = p.stock_actual === 0;
                const bajo = p.stock_actual <= p.stock_minimo;
                const sinPrecio = Number(p.precio) <= 0;
                
                return (
                  <tr key={p.id} className="hover-lift">
                    <td>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{p.nombre.toUpperCase()}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", background: "rgba(99, 102, 241, 0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.codigo}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 16, fontWeight: 950, color: sinPrecio ? "#ef4444" : "#0f172a" }}>RD${Number(p.precio).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>COSTO: RD${Number(p.costo).toLocaleString()}</div>
                      {sinPrecio && <div style={{ fontSize: 9, fontWeight: 950, color: "#ef4444", marginTop: 2 }}>⚠️ REQUIERE CONFIGURACIÓN</div>}
                    </td>
                    <td>
                      <div style={{ 
                        display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 900,
                        background: agotado ? "#fff1f2" : bajo ? "#fffbeb" : "#f0fdf4",
                        color: agotado ? "#ef4444" : bajo ? "#d97706" : "#10b981",
                        border: `1px solid ${agotado ? "#fecaca" : bajo ? "#fef3c7" : "#dcfce7"}`
                      }}>
                        {agotado ? "SIN STOCK" : `${p.stock_actual} UNIDADES`}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost hover-lift" onClick={() => { setForm(p); setModal("editar"); }} style={{ width: 44, height: 44, padding: 0, borderRadius: 12, background: "#f8fafc" }}>
                          <Edit2 size={18} color="#6366f1" />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost hover-lift" onClick={() => setConfirmPassword({ open: true, id: p.id, pass: "", error: "", loading: false })} 
                            style={{ width: 44, height: 44, padding: 0, borderRadius: 12, background: "#fff1f2", color: "#ef4444", border: "1px solid #fee2e2" }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
