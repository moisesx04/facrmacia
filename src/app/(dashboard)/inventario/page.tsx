"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Upload, Download, X, AlertTriangle, TrendingUp, Package, Zap } from "lucide-react";

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

  // Optimización: Debounce de búsqueda incorporado en el efecto
  useEffect(() => {
    const timer = setTimeout(() => {
      cargar();
    }, 400); // 400ms debounce
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

  async function guardar() {
    setGuardando(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const { categorias, ...saveData } = form as any;
      const res = await fetch("/api/productos", { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(saveData) 
      });
      if (res.ok) {
        setModal(null);
        setForm(EMPTY);
        await cargar();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar() {
    setConfirmPassword(p => ({ ...p, loading: true, error: "" }));
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword.pass })
      });
      if (res.ok) {
        await fetch(`/api/productos?id=${confirmPassword.id}`, { method: "DELETE" });
        setConfirmPassword({ open: false, id: "", pass: "", error: "", loading: false });
        await cargar();
      } else {
        const data = await res.json();
        setConfirmPassword(p => ({ ...p, error: data.error || "Inválido", loading: false }));
      }
    } catch (err) {
      setConfirmPassword(p => ({ ...p, error: "Error", loading: false }));
    }
  }

  async function importarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/productos/bulk", { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data);
    setImportLoading(false);
    await cargar();
  }

  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  return (
    <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 100 }}>
      {/* HEADER VIBRANTE */}
      <div className="page-header" style={{ marginBottom: 64 }}>
        <div>
          <h1 className="page-title">Almacén Central</h1>
          <p className="page-subtitle">GESTIÓN ULTRA-VIBRANTE V6.0</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {isAdmin && (
            <>
              <button className="btn btn-ghost hover-lift" onClick={() => setModal("importar")} style={{ height: 56 }}>
                <Upload size={18} /> IMPORTAR
              </button>
              <button className="btn btn-primary hover-lift" onClick={() => { setForm(EMPTY); setModal("crear"); }} style={{ height: 56, padding: "0 32px" }}>
                <Plus size={20} /> NUEVO ITEM
              </button>
            </>
          )}
        </div>
      </div>

      {/* HERO STATS V6.0 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, marginBottom: 64 }}>
        <div className="glass hover-lift" style={{ padding: 40, borderRadius: 40, background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))", border: "1px solid rgba(255,255,255,0.15)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 64, height: 64, background: "rgba(99, 102, 241, 0.3)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>
               <Package size={32} color="white" />
             </div>
             <span style={{ fontSize: 10, fontWeight: 950, color: "#6366f1", background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 10 }}>ACTIVO</span>
           </div>
           <div style={{ marginTop: 24 }}>
             <div style={{ fontSize: 48, fontWeight: 950, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{totalCount}</div>
             <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 8 }}>Medicamentos Totales</div>
           </div>
        </div>

        <div className="glass hover-lift" style={{ padding: 40, borderRadius: 40, background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 64, height: 64, background: "rgba(239, 68, 68, 0.3)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)" }}>
               <AlertTriangle size={32} color="white" />
             </div>
             <span style={{ fontSize: 10, fontWeight: 950, color: "#ef4444", background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 10 }}>CRÍTICO</span>
           </div>
           <div style={{ marginTop: 24 }}>
             <div style={{ fontSize: 48, fontWeight: 950, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{bajoStock.length}</div>
             <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 8 }}>Alertas de Stock</div>
           </div>
        </div>

        <div className="glass hover-lift" style={{ padding: 40, borderRadius: 40, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
             <div style={{ width: 64, height: 64, background: "rgba(16, 185, 129, 0.3)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)" }}>
               <Zap size={32} color="white" />
             </div>
             <span style={{ fontSize: 10, fontWeight: 950, color: "#10b981", background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 10 }}>LIVE</span>
           </div>
           <div style={{ marginTop: 24 }}>
             <div style={{ fontSize: 48, fontWeight: 950, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{productos.filter(p => Number(p.precio) > 0).length}</div>
             <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 8 }}>Precios Listos</div>
           </div>
        </div>
      </div>

      {/* SEARCH VIBRANTE */}
      <div className="glass" style={{ padding: 24, borderRadius: 32, marginBottom: 40, background: "rgba(15, 23, 42, 0.4)" }}>
        <div style={{ position: "relative" }}>
          <Search size={24} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", color: "#6366f1" }} />
          <input className="input" placeholder="Buscar medicina, SKU o descripción comercial..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
            style={{ paddingLeft: 72, height: 72, borderRadius: 24, fontSize: 18, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      </div>

      {/* TABLA ULTRA-VIBRANTE */}
      <div className="glass" style={{ borderRadius: 40, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="table-container" style={{ padding: "0 16px" }}>
          <table style={{ background: "transparent", borderCollapse: "separate", borderSpacing: "0 12px" }}>
            <thead>
              <tr>
                <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, padding: 24, border: "none" }}>Medicina</th>
                <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, padding: 24, border: "none" }}>Finanzas</th>
                <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, padding: 24, border: "none" }}>Stock</th>
                <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, padding: 24, border: "none", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={4} style={{ padding: 12 }}><div className="skeleton" style={{ height: 80, borderRadius: 24 }} /></td></tr>
              )) : productos.map((p) => {
                const agotado = p.stock_actual === 0;
                const bajo = p.stock_actual <= p.stock_minimo;
                const sinPrecio = Number(p.precio) <= 0;
                
                return (
                  <tr key={p.id} className="hover-lift" style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 24 }}>
                    <td style={{ padding: "24px", borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}>
                      <div style={{ fontSize: 16, fontWeight: 950, color: "white" }}>{p.nombre.toUpperCase()}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#6366f1", background: "rgba(99, 102, 241, 0.2)", padding: "2px 8px", borderRadius: 6 }}>{p.codigo}</span>
                      </div>
                    </td>
                    <td style={{ padding: "24px" }}>
                      <div style={{ fontSize: 18, fontWeight: 950, color: sinPrecio ? "#ef4444" : "#10b981" }}>RD${Number(p.precio).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>COSTO: RD${Number(p.costo).toLocaleString()}</div>
                      {sinPrecio && <div style={{ fontSize: 9, fontWeight: 950, color: "#ef4444", marginTop: 4 }}>⚠️ PENDIENTE</div>}
                    </td>
                    <td style={{ padding: "24px" }}>
                      <div style={{ 
                        display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 14, fontSize: 13, fontWeight: 950,
                        background: agotado ? "rgba(239, 68, 68, 0.1)" : bajo ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
                        color: agotado ? "#ef4444" : bajo ? "#f59e0b" : "#10b981",
                        border: `1px solid ${agotado ? "rgba(239, 68, 68, 0.2)" : bajo ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 10px currentColor" }} />
                        {agotado ? "AGOTADO" : `${p.stock_actual} UNIDADES`}
                      </div>
                    </td>
                    <td style={{ padding: "24px", textAlign: "right", borderTopRightRadius: 24, borderBottomRightRadius: 24 }}>
                      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost hover-lift" onClick={() => { setForm(p); setModal("editar"); }} style={{ width: 44, height: 44, padding: 0, borderRadius: 14 }}>
                          <Edit2 size={18} />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost hover-lift" onClick={() => setConfirmPassword({ open: true, id: p.id, pass: "", error: "", loading: false })} 
                            style={{ width: 44, height: 44, padding: 0, borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
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
