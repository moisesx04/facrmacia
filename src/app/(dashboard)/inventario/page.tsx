"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Upload, AlertTriangle, Package, Zap } from "lucide-react";

interface Producto {
  id: string; codigo: string; nombre: string; precio: number; costo: number;
  itbis: number; aplica_itbis: boolean; stock_actual: number; stock_minimo: number; activo: boolean;
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
  const [confirmPassword, setConfirmPassword] = useState<{ open: boolean; id: string; pass: string; error: string; loading: boolean }>({ open: false, id: "", pass: "", error: "", loading: false });

  useEffect(() => {
    const timer = setTimeout(() => {
      cargar();
    }, 300);
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
    <div style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 60, paddingTop: 40 }}>
      {/* Header Minimalista */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Gestión de catálogo y existencias</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {isAdmin && (
            <>
              <button className="btn btn-outline" onClick={() => setModal("importar")}>
                <Upload size={16} /> Importar Datos
              </button>
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal("crear"); }}>
                <Plus size={16} /> Agregar Producto
              </button>
            </>
          )}
        </div>
      </div>

      <div className="inventory-stats">
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Total de Productos</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{totalCount}</div>
        </div>
        <div className="card" style={{ padding: 20, borderColor: bajoStock.length > 0 ? "var(--danger)" : "var(--border)" }}>
          <div className="label">Stock Crítico</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: bajoStock.length > 0 ? "var(--danger)" : "inherit" }}>{bajoStock.length}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
           <div className="label">Búsqueda Rápida</div>
           <div style={{ position: "relative", marginTop: 8 }}>
             <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
             <input className="input" placeholder="Referencia, nombre, etc..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ paddingLeft: 32 }} />
           </div>
        </div>
      </div>

      {/* Datagrid Puro */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="datagrid">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Estado</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={isAdmin ? 5 : 4} style={{ padding: "16px 24px" }}>
                    <div style={{ height: 20, width: "100%", background: "var(--border)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                  </td>
                </tr>
              )) : productos.map((p) => {
                const isAgotado = p.stock_actual === 0;
                const isBajo = p.stock_actual > 0 && p.stock_actual <= p.stock_minimo;
                const sinPrecio = Number(p.precio) <= 0;
                
                return (
                  <tr key={p.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{p.codigo}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      {sinPrecio && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>Configurar precio</div>}
                    </td>
                    <td style={{ fontWeight: 500 }}>RD${Number(p.precio).toLocaleString()}</td>
                    <td>
                      {isAgotado ? (
                        <span className="badge badge-danger">Agotado</span>
                      ) : isBajo ? (
                        <span className="badge badge-warning">{p.stock_actual} Bajo stock</span>
                      ) : (
                        <span className="badge badge-success">{p.stock_actual} En stock</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost" style={{ padding: "6px" }} onClick={() => { setForm(p); setModal("editar"); }}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: "6px", color: "var(--danger)" }} onClick={() => setConfirmPassword({ open: true, id: p.id, pass: "", error: "", loading: false })}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
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
