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
    const method = form.id ? "PUT" : "POST";
    await fetch("/api/productos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setModal(null);
    setForm(EMPTY);
    await cargar();
    setGuardando(false);
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
    const csv = "codigo,nombre,precio,costo,stock,stock_minimo\nMED001,Amoxicilina 500mg,150.00,80.00,50,10";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plantilla_productos.csv"; a.click();
  }

  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">{productos.length} productos · {bajoStock.length} con stock bajo</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {isAdmin && <>
            <button id="btn-importar" className="btn btn-ghost" onClick={() => setModal("importar")}><Upload size={16} /> Importar CSV</button>
            <button id="btn-nuevo-producto" className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal("crear"); }}><Plus size={16} /> Nuevo Producto</button>
          </>}
        </div>
      </div>

      {bajoStock.length > 0 && (
        <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "var(--radius-sm)", marginBottom: 20, alignItems: "center", fontSize: 13 }}>
          <AlertTriangle size={16} color="#f59e0b" />
          <span><strong>{bajoStock.length} productos</strong> por debajo del stock mínimo</span>
        </div>
      )}

      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                  <tr key={p.id}>
                    <td><span className="badge badge-info">{p.codigo}</span></td>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>RD${Number(p.precio).toFixed(2)}</td>
                    <td style={{ color: "var(--text-secondary)" }}>RD${Number(p.costo).toFixed(2)}</td>
                    <td><span className={`badge ${p.aplica_itbis ? "badge-warning" : "badge-info"}`}>{p.aplica_itbis ? "18%" : "Exento"}</span></td>
                    <td>
                      <span className={`badge ${p.stock_actual === 0 ? "badge-danger" : bajo ? "badge-warning" : "badge-success"}`}>
                        {p.stock_actual === 0 ? "⚠ Sin stock" : bajo ? `⚠ ${p.stock_actual}` : p.stock_actual}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{p.stock_minimo}</td>
                    {isAdmin && <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button id={`edit-${p.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm(p); setModal("editar"); }}><Edit2 size={14} /></button>
                        <button id={`del-${p.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => eliminar(p.id)}><Trash2 size={14} color="var(--danger)" /></button>
                      </div>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {(modal === "crear" || modal === "editar") && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === "crear" ? "Nuevo Producto" : "Editar Producto"}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                { label: "Código", key: "codigo", type: "text" },
                { label: "Nombre", key: "nombre", type: "text" },
                { label: "Precio (RD$)", key: "precio", type: "number" },
                { label: "Costo (RD$)", key: "costo", type: "number" },
                { label: "Stock Actual", key: "stock_actual", type: "number" },
                { label: "Stock Mínimo", key: "stock_minimo", type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="label" style={{ fontSize: 11, fontWeight: 800 }}>{label}</label>
                  <input className="input" type={type} value={String(form[key as keyof Producto] || "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    style={{ borderRadius: 0, border: "2px solid #000000" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, background: "#f8fafc", padding: "12px", border: "1px solid #000000" }}>
                  <input type="checkbox" checked={form.aplica_itbis ?? true} onChange={(e) => setForm((f) => ({ ...f, aplica_itbis: e.target.checked }))} style={{ width: 20, height: 20, accentColor: "#000000" }} />
                  APLICAR ITBIS (18%)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-producto" className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {modal === "importar" && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Importar Productos (CSV)</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setModal(null); setImportResult(null); }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Sube un archivo CSV con los campos: <code>codigo, nombre, precio, costo, stock, stock_minimo</code>
            </p>
            <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={descargarPlantilla}><Download size={16} /> Descargar Plantilla</button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={importarCSV} />
            <button id="btn-seleccionar-csv" className="btn btn-primary w-full" style={{ justifyContent: "center" }} onClick={() => fileRef.current?.click()} disabled={importLoading}>
              <Upload size={16} /> {importLoading ? "Importando..." : "Seleccionar archivo CSV"}
            </button>
            {importResult && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ color: "var(--success)", fontWeight: 600 }}>✅ {importResult.insertados} productos importados</div>
                {importResult.errores.length > 0 && <div style={{ color: "var(--danger)", marginTop: 8, fontSize: 12 }}>{importResult.errores.join(", ")}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
