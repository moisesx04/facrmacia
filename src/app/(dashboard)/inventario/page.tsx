"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Upload, Download, X, AlertTriangle } from "lucide-react";

interface Producto {
  id: string; codigo: string; nombre: string; precio: number; costo: number;
  itbis: number; aplica_itbis: boolean; stock_actual: number; stock_minimo: number; activo: boolean;
  categorias?: { nombre: string };
}

const EMPTY: Partial<Producto> = { codigo: "", nombre: "", precio: 0, costo: 0, itbis: 0.18, aplica_itbis: true, stock_actual: 0, stock_minimo: 5 };

const INFO_MERGE = "MODO INTELIGENTE: El sistema solo actualizará precios y stock si el valor en el archivo es mayor a cero. Los campos vacíos preservarán tus datos actuales.";

export default function InventarioPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"crear" | "editar" | "importar" | null>(null);
  const [form, setForm] = useState<Partial<Producto>>(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ insertados: number; errores: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    setLoading(true);
    const res = await fetch(`/api/productos?q=${encodeURIComponent(busqueda)}&limit=100`);
    const data = await res.json();
    setProductos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [busqueda]);

  async function guardar() {
    setGuardando(true);
    try {
      const method = form.id ? "PUT" : "POST";
      // Limpiar el objeto para enviar solo lo que la DB espera
      const { categorias, ...saveData } = form as any;
      
      const res = await fetch("/api/productos", { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(saveData) 
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Error al guardar:", error);
        alert("Error al guardar el producto: " + (error.error || "Desconocido"));
      } else {
        setModal(null);
        setForm(EMPTY);
        await cargar();
      }
    } catch (err) {
      console.error(err);
      alert("Error crítico al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/productos?id=${id}`, { method: "DELETE" });
    await cargar();
  }

  async function importarCSV(e: React.ChangeEvent<HTMLInputElement>) {
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

  function descargarPlantilla() {
    const csv = "codigo,nombre,precio_opcional,costo_opcional,stock_actual_opcional,stock_minimo_opcional\nMED001,Amoxicilina 500mg,150.00,80.00,50,10\nMED002,Paracetamol 500mg,,,,";
    const BOM = "\uFEFF"; // Byte Order Mark for Excel
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plantilla_productos.csv"; a.click();
  }

  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  return (    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Catálogo de Inventario</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>CONTROL DE EXISTENCIAS Y PRECIOS</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%", maxWidth: "fit-content" }}>
          {isAdmin && (
            <>
              <button id="btn-importar" className="btn btn-ghost" onClick={() => setModal("importar")} style={{ borderRadius: 16, height: 52, padding: "0 20px", flex: 1 }}>
                <Upload size={18} /> IMPORTAR
              </button>
              <button id="btn-nuevo-producto" className="btn btn-primary btn-lg" onClick={() => { setForm(EMPTY); setModal("crear"); }} style={{ borderRadius: 18, padding: "0 24px", height: 52, flex: 1 }}>
                <Plus size={20} /> NUEVO
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
        <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
          <div className="search-bar" style={{ maxWidth: "100%" }}>
            <Search size={20} className="search-icon" color="#6366f1" />
            <input id="buscar-producto" className="input" placeholder="BUSCAR (F1)..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
              style={{ height: 52, fontSize: 15, paddingLeft: 48, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc" }} />
          </div>
        </div>
        
        {bajoStock.length > 0 && (
          <div style={{ 
            display: "flex", gap: 16, padding: 20, background: "rgba(245,158,11,0.05)", 
            border: "2px solid rgba(245,158,11,0.1)", borderRadius: 20, alignItems: "center" 
          }}>
            <div style={{ width: 48, height: 48, background: "#fef3c7", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#92400e" }}>{bajoStock.length} Alertas</div>
              <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>VER ARTÍCULOS CRÍTICOS</div>
            </div>
          </div>
        )}
      </div>

      <div className="glass" style={{ borderRadius: 24, overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none", overflowX: "auto" }}>
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ padding: "16px 24px" }}>CÓDIGO</th>
                <th style={{ padding: "16px 24px" }}>DESCRIPCIÓN</th>
                <th style={{ padding: "16px 24px" }}>PRECIO</th>
                <th style={{ padding: "16px 24px" }}>STOCK</th>
                <th style={{ padding: "16px 24px", textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} style={{ padding: "20px 32px" }}><div className="skeleton" style={{ height: 18 }} /></td>)}</tr>
              )) : productos.map((p) => {
                const bajo = p.stock_actual <= p.stock_minimo;
                return (
                  <tr key={p.id}>
                    <td style={{ padding: "20px 32px" }}>
                      <span style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 10, fontSize: 11, fontWeight: 900, color: "#475569" }}>
                        {p.codigo}
                      </span>
                    </td>
                    <td style={{ padding: "20px 32px", fontWeight: 800, color: "#0f172a", fontSize: 14 }}>{p.nombre.toUpperCase()}</td>
                    <td style={{ padding: "20px 32px", color: "#6366f1", fontWeight: 800 }}>RD${Number(p.precio).toLocaleString()}</td>
                    <td style={{ padding: "20px 32px", color: "#64748b", fontWeight: 600 }}>RD${Number(p.costo).toLocaleString()}</td>
                    <td style={{ padding: "20px 32px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.aplica_itbis ? "#f59e0b" : "#94a3b8" }}>
                        {p.aplica_itbis ? "18% GRAV." : "EXENTO"}
                      </span>
                    </td>
                    <td style={{ padding: "20px 32px" }}>
                      <div style={{ 
                        display: "inline-flex", padding: "6px 14px", borderRadius: 10, fontSize: 13, fontWeight: 900,
                        background: p.stock_actual === 0 ? "#fef2f2" : bajo ? "#fffbeb" : "#f0fdf4",
                        color: p.stock_actual === 0 ? "#ef4444" : bajo ? "#d97706" : "#10b981",
                        border: `1px solid ${p.stock_actual === 0 ? "#fee2e2" : bajo ? "#fef3c7" : "#dcfce7"}`
                      }}>
                        {p.stock_actual === 0 ? "AGOTADO" : `${p.stock_actual} UNID.`}
                      </div>
                    </td>
                    <td style={{ padding: "20px 32px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm(p); setModal("editar"); }} style={{ background: "#f1f5f9", borderRadius: 10, padding: 10 }}>
                          <Edit2 size={16} color="#6366f1" />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm" onClick={() => eliminar(p.id)} style={{ background: "#fef2f2", borderRadius: 10, padding: 10 }}>
                            <Trash2 size={16} color="#ef4444" />
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

      {/* Modals con estilo premium */}
      {(modal === "crear" || modal === "editar") && (
        <div className="modal-overlay">
          <div className="modal" style={{ borderRadius: 28, padding: 40, background: "white", maxWidth: 700 }}>
            <div className="modal-header" style={{ marginBottom: 32 }}>
              <div style={{ background: "#f1f5f9", padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 900, color: "#6366f1", letterSpacing: "0.1em" }}>
                {modal === "crear" ? "NUEVO REGISTRO" : "MODIFICAR PRODUCTO"}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)} style={{ background: "#f8fafc", borderRadius: 12 }}><X size={20} /></button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {[
                { label: "CÓDIGO DE BARRAS", key: "codigo" }, { label: "NOMBRE DEL PRODUCTO", key: "nombre" },
                { label: "PRECIO VENTA (RD$)", key: "precio", type: "number" }, { label: "COSTO ADQUISICIÓN (RD$)", key: "costo", type: "number" },
                { label: "STOCK INICIAL", key: "stock_actual", type: "number" }, { label: "ALERTA STOCK MÍNIMO", key: "stock_minimo", type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>{label}</label>
                  <input className="input" type={type || "text"} value={String(form[key as keyof Producto] || "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    style={{ background: "#f8fafc", border: "2px solid #eff6ff", borderRadius: 14, height: 52, fontWeight: 600 }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ 
                  display: "flex", alignItems: "center", gap: 14, cursor: "pointer", 
                  background: "#f8fafc", padding: "20px", borderRadius: 18, border: "2px solid #eff6ff" 
                }}>
                  <input type="checkbox" checked={form.aplica_itbis ?? true} onChange={(e) => setForm((f) => ({ ...f, aplica_itbis: e.target.checked }))} 
                    style={{ width: 24, height: 24, accentColor: "#6366f1" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>APLICAR ITBIS (18% DE IMPUESTO)</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ flex: 1, height: 56, borderRadius: 16, fontWeight: 800 }}>CANCELAR</button>
              <button id="btn-guardar-producto" className="btn btn-primary" onClick={guardar} disabled={guardando} 
                style={{ flex: 2, height: 56, borderRadius: 16 }}>
                {guardando ? "GUARDANDO..." : "✓ GUARDAR PRODUCTO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar refined */}
      {modal === "importar" && (
        <div className="modal-overlay">
          <div className="modal" style={{ borderRadius: 28, padding: 40, background: "white", maxWidth: 500 }}>
            <div style={{ background: "#eff6ff", padding: 20, borderRadius: 16, border: "1px dashed #6366f1", marginBottom: 24 }}>
               <h4 style={{ fontSize: 12, fontWeight: 900, color: "#1e40af", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} /> IMPORTACIÓN INTELIGENTE ACTIVA
               </h4>
               <p style={{ fontSize: 11, color: "#1e40af", fontWeight: 600, lineHeight: 1.5 }}>{INFO_MERGE}</p>
            </div>
            
            <button className="btn btn-ghost" onClick={descargarPlantilla} style={{ width: "100%", height: 52, borderRadius: 14, marginBottom: 16, border: "2px solid #eff6ff" }}>
              <Download size={18} /> DESCARGAR PLANTILLA EXCEL (CSV)
            </button>
            
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={importarCSV} />
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={importLoading} style={{ width: "100%", height: 56, borderRadius: 16 }}>
              <Upload size={18} /> {importLoading ? "IMPORTANDO..." : "SUBIR ARCHIVO CSV"}
            </button>
            
            {importResult && (
              <div style={{ marginTop: 24, padding: 20, background: "#f0fdf4", border: "2px solid #dcfce7", borderRadius: 18 }}>
                <div style={{ color: "#166534", fontWeight: 800 }}>✅ {importResult.insertados} PRODUCTOS CARGADOS</div>
                {importResult.errores.length > 0 && <div style={{ color: "#991b1b", marginTop: 10, fontSize: 12, fontFamily: "monospace" }}>{importResult.errores.join(", ")}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
