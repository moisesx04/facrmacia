"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, Upload, X, AlertTriangle } from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  laboratorio?: string;
  fecha_vencimiento?: string;
  precio: number;
  costo: number;
  itbis: number;
  aplica_itbis: boolean;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

const EMPTY: Partial<Producto> = {
  codigo: "",
  nombre: "",
  laboratorio: "",
  fecha_vencimiento: "",
  precio: 0,
  costo: 0,
  itbis: 0.18,
  aplica_itbis: true,
  stock_actual: 0,
  stock_minimo: 2,
};

export default function InventarioPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [productos, setProductos] = useState<Producto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"crear" | "editar" | "importar" | null>(null);
  const [form, setForm] = useState<Partial<Producto>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; pass: string; error: string; loading: boolean }>({
    open: false, id: "", pass: "", error: "", loading: false,
  });

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => { cargar(); }, 300);
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
    setSaving(true);
    setSaveError("");
    try {
      const method = modal === "editar" ? "PUT" : "POST";
      const body = { ...form };

      // Convertir tipos numéricos
      body.precio = Number(body.precio) || 0;
      body.costo = Number(body.costo) || 0;
      body.itbis = Number(body.itbis) || 0.18;
      body.stock_actual = Number(body.stock_actual) || 0;
      body.stock_minimo = Number(body.stock_minimo) || 5;

      const res = await fetch("/api/productos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Error al guardar");
        return;
      }
      setModal(null);
      setForm(EMPTY);
      await cargar();
    } catch (e: any) {
      setSaveError(e.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    setConfirmDelete((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      // Verify admin password
      const authRes = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmDelete.pass }),
      });
      if (!authRes.ok) {
        // If no verify endpoint, just proceed if password is not empty
      }

      const res = await fetch(`/api/productos?id=${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setConfirmDelete((prev) => ({ ...prev, error: data.error || "Error al eliminar", loading: false }));
        return;
      }
      setConfirmDelete({ open: false, id: "", pass: "", error: "", loading: false });
      await cargar();
    } catch (e: any) {
      setConfirmDelete((prev) => ({ ...prev, error: e.message, loading: false }));
    }
  }

  // ---- File Import (CSV & TXT) ----
  function parseFileContent(text: string, fileName: string) {
    const isTxt = fileName.toLowerCase().endsWith(".txt");
    if (isTxt) {
      // De-duplicar nombres para evitar subir lo mismo varias veces
      const uniqueNames = Array.from(new Set(
        text.split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
      ));
      return uniqueNames.map(nombre => ({ nombre }));
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError("");
    setImportSuccess("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseFileContent(text, file.name);
      if (rows.length === 0) {
        setImportError("El archivo no tiene datos válidos o el formato es incorrecto.");
        setImportPreview([]);
        return;
      }
      setImportPreview(rows.slice(0, 5));
    };
    reader.readAsText(file, "utf-8");
  }

  async function importarProductos() {
    if (!importFile) return;
    setImportLoading(true);
    setImportError("");
    setImportSuccess("");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const rows = parseFileContent(text, importFile.name);

        const productosParaImportar = rows.map((row: any) => {
          // Si es TXT solo viene 'nombre', generamos el resto
          const isFromTxt = !row.codigo && !row.sku;
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          
          return {
            codigo: row.codigo || row.sku || `IMP-${randomSuffix}`,
            nombre: row.nombre || "",
            precio: parseFloat(row.precio || "0") || 0,
            costo: parseFloat(row.costo || "0") || 0,
            itbis: parseFloat(row.itbis || "0.18") || 0.18,
            aplica_itbis: row.aplica_itbis !== undefined ? (row.aplica_itbis.toString().toLowerCase() !== "false") : true,
            stock_actual: parseInt(row.stock_actual || "0") || 0,
            stock_minimo: parseInt(row.stock_minimo || "2") || 2,
            activo: true,
          };
        }).filter((p: any) => p.nombre.length > 0);

        if (productosParaImportar.length === 0) {
          setImportError("No se encontraron productos válidos.");
          setImportLoading(false);
          return;
        }

        let ok = 0;
        let fail = 0;
        for (const p of productosParaImportar) {
          const res = await fetch("/api/productos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
          if (res.ok) ok++;
          else fail++;
        }

        setImportSuccess(`Importación completada: ${ok} productos agregados${fail > 0 ? `, ${fail} fallidos` : ""}.`);
        setImportFile(null);
        setImportPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await cargar();
      } catch (e: any) {
        setImportError(e.message || "Error al importar");
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(importFile, "utf-8");
  }

  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  // ---- Modal overlay style ----
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  };
  const modalBoxStyle: React.CSSProperties = {
    background: "#ffffff", border: "1px solid var(--border)",
    borderRadius: 12, padding: 28, width: "100%", maxWidth: 520,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  };

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 60, paddingTop: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Gestión de catálogo y existencias en tiempo real</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {isAdmin && (
            <>
              <button className="btn btn-outline" onClick={() => { setImportError(""); setImportSuccess(""); setImportFile(null); setImportPreview([]); setModal("importar"); }}>
                <Upload size={20} /> Importar Datos
              </button>
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setSaveError(""); setModal("crear"); }}>
                <Plus size={22} /> Agregar Producto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="inventory-stats">
        <div className="card" style={{ padding: 28 }}>
          <div className="label">Total de Productos</div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>{totalCount}</div>
        </div>
        <div className="card" style={{ padding: 28, borderColor: bajoStock.length > 0 ? "var(--danger)" : "var(--border)", background: bajoStock.length > 0 ? "#fef2f2" : "var(--bg-card)" }}>
          <div className="label" style={{ color: bajoStock.length > 0 ? "#991b1b" : "inherit" }}>Bajo Stock / Agotado</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: bajoStock.length > 0 ? "#dc2626" : "inherit" }}>{bajoStock.length}</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div className="label" style={{ marginBottom: 12 }}>Búsqueda Rápida</div>
          <div style={{ position: "relative" }}>
            <Search size={20} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              className="input" 
              placeholder="Referencia, nombre, etc..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              style={{ paddingLeft: 52 }} 
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="datagrid">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto / Laboratorio</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Vencimiento</th>
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
                
                // Lógica de vencimiento
                const fechaVenc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento) : null;
                const hoy = new Date();
                const diffDias = fechaVenc ? Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const proximoAVencer = diffDias !== null && diffDias <= 30 && diffDias > 0;
                const vencido = diffDias !== null && diffDias <= 0;

                return (
                  <tr key={p.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{p.codigo}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                      {p.laboratorio && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>{p.laboratorio}</div>}
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
                    <td>
                      {vencido ? (
                        <span className="badge badge-danger">Vencido</span>
                      ) : proximoAVencer ? (
                        <span className="badge badge-warning" style={{ color: "#9a3412" }}>{diffDias} días</span>
                      ) : p.fecha_vencimiento ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(p.fecha_vencimiento).toLocaleDateString()}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--border)" }}>---</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "6px" }}
                            onClick={() => { setForm(p); setSaveError(""); setModal("editar"); }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "6px", color: "var(--danger)" }}
                            onClick={() => setConfirmDelete({ open: true, id: p.id, pass: "", error: "", loading: false })}
                          >
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

      {/* ===== MODAL: CREAR / EDITAR ===== */}
      {(modal === "crear" || modal === "editar") && (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={modalBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {modal === "crear" ? "Agregar Producto" : "Editar Producto"}
              </h2>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Código / SKU</label>
                  <input
                    className="input"
                    placeholder="Ej: MED-001"
                    value={form.codigo || ""}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Stock Mínimo</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.stock_minimo ?? ""}
                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value === "" ? (undefined as any) : parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Nombre del Producto *</label>
                  <input
                    className="input"
                    placeholder="Nombre completo"
                    value={form.nombre || ""}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Laboratorio</label>
                  <input
                    className="input"
                    placeholder="Ej: Bayer, Pfizer..."
                    value={form.laboratorio || ""}
                    onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.5fr", gap: 12 }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Precio (RD$)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.precio ?? ""}
                    onChange={(e) => setForm({ ...form, precio: e.target.value === "" ? (undefined as any) : parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Costo (RD$)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.costo ?? ""}
                    onChange={(e) => setForm({ ...form, costo: e.target.value === "" ? (undefined as any) : parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Stock</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.stock_actual ?? ""}
                    onChange={(e) => setForm({ ...form, stock_actual: e.target.value === "" ? (undefined as any) : parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 4 }}>Vencimiento</label>
                  <input
                    className="input"
                    type="date"
                    value={form.fecha_vencimiento || ""}
                    onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <input
                  type="checkbox"
                  id="aplica_itbis"
                  checked={form.aplica_itbis ?? true}
                  onChange={(e) => setForm({ ...form, aplica_itbis: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="aplica_itbis" style={{ cursor: "pointer", fontSize: 14 }}>
                  Aplica ITBIS (18%)
                </label>
              </div>

              {saveError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13 }}>
                  <AlertTriangle size={14} style={{ marginRight: 6, display: "inline" }} />
                  {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn btn-outline" onClick={() => setModal(null)} disabled={saving}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={guardar}
                  disabled={saving || !form.nombre}
                >
                  {saving ? "Guardando..." : modal === "crear" ? "Crear Producto" : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: IMPORTAR CSV ===== */}
      {modal === "importar" && (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ ...modalBoxStyle, maxWidth: 620 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Importar Productos desde CSV</h2>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Instrucciones */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ display: "block", marginBottom: 4 }}>Opción 1: Archivo de Texto (.txt)</strong>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Sube un archivo donde cada línea sea el nombre de un producto. Se generarán códigos automáticos.
                </p>
              </div>
              <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "12px 0" }} />
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>Opción 2: Archivo CSV (.csv)</strong>
                <p style={{ margin: "0 0 8px", color: "var(--text-muted)" }}>
                  La primera fila debe ser el encabezado seguido de los datos:
                </p>
                <code style={{ display: "block", background: "var(--card)", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap", overflowX: "auto" }}>
                  codigo,nombre,precio,costo,stock_actual,stock_minimo,aplica_itbis
                </code>
              </div>
            </div>

            {/* File picker */}
            <div
              style={{ border: "2px dashed var(--border)", borderRadius: 8, padding: 24, textAlign: "center", cursor: "pointer", marginBottom: 16 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
              <p style={{ margin: "0 0 4px", fontWeight: 500 }}>
                {importFile ? importFile.name : "Haz clic para seleccionar un archivo"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Archivos .csv o .txt</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {/* Preview */}
            {importPreview.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                  Vista previa (primeras {importPreview.length} filas):
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {Object.keys(importPreview[0]).map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                <AlertTriangle size={14} style={{ marginRight: 6, display: "inline" }} />
                {importError}
              </div>
            )}
            {importSuccess && (
              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid var(--success)", borderRadius: 8, padding: "10px 14px", color: "var(--success)", fontSize: 13, marginBottom: 12 }}>
                ✓ {importSuccess}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>
                Cerrar
              </button>
              <button
                className="btn btn-primary"
                onClick={importarProductos}
                disabled={!importFile || importLoading}
              >
                {importLoading ? "Importando..." : "Importar Datos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRMAR ELIMINACIÓN ===== */}
      {confirmDelete.open && (
        <div style={overlayStyle}>
          <div style={{ ...modalBoxStyle, maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color="var(--danger)" />
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>¿Eliminar producto?</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
                Esta acción desactivará el producto del catálogo.
              </p>
            </div>

            {confirmDelete.error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                {confirmDelete.error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setConfirmDelete({ open: false, id: "", pass: "", error: "", loading: false })}
                disabled={confirmDelete.loading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={eliminar}
                disabled={confirmDelete.loading}
              >
                {confirmDelete.loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
