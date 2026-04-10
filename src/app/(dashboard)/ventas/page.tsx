"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useReactToPrint } from "react-to-print";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, AlertCircle, X } from "lucide-react";
import { PrintInvoice, type InvoiceData } from "@/components/PrintInvoice";
import { NCF_LABELS, type NCFTipo } from "@/lib/ncf";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  itbis: number;
  aplica_itbis: boolean;
  stock_actual: number;
}
interface CartItem extends Producto { cantidad: number }
interface Cliente { id: string; nombre: string; cedula_rnc?: string }
interface NCFSecuencia { id: string; tipo: NCFTipo; prefix: string; secuencia_actual: number; secuencia_fin: number }

export default function VentasPage() {
  const { data: session } = useSession();
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [ncfTipo, setNcfTipo] = useState<NCFTipo>("B02");
  const [ncfSecuencias, setNcfSecuencias] = useState<NCFSecuencia[]>([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [aplicarItbis, setAplicarItbis] = useState(true);
  const [descuento, setDescuento] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [facturaActual, setFacturaActual] = useState<InvoiceData | null>(null);
  const [modoPrint, setModoPrint] = useState<"a4" | "termica">("a4");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const buscarProductos = useCallback(async (q: string) => {
    const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}&limit=20`);
    const data = await res.json();
    setProductos(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    buscarProductos(busqueda);
  }, [busqueda, buscarProductos]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/ncf-secuencias").then((r) => r.json()),
    ]).then(([cls, ncfs]) => {
      setClientes(Array.isArray(cls) ? cls : []);
      setNcfSecuencias(Array.isArray(ncfs) ? ncfs : []);
      if (Array.isArray(cls) && cls.length > 0) setClienteId(cls[0].id);
    });
  }, []);

  function agregarProducto(p: Producto) {
    setCart((prev) => {
      const existe = prev.find((i) => i.id === p.id);
      if (existe) {
        if (existe.cantidad >= p.stock_actual) return prev;
        return prev.map((i) => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...p, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, cantidad: Math.max(1, Math.min(i.cantidad + delta, i.stock_actual)) } : i)
    );
  }

  function removeItem(id: string) { setCart((prev) => prev.filter((i) => i.id !== id)); }

  const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const itbisTotal = aplicarItbis ? cart.reduce((s, i) => s + (i.aplica_itbis ? i.itbis * i.precio * i.cantidad : 0), 0) : 0;
  const total = subtotal + itbisTotal - descuento;

  const ncfActual = ncfSecuencias.find((n) => n.tipo === ncfTipo);
  const ncfAgotado = ncfActual && ncfActual.secuencia_actual > ncfActual.secuencia_fin;

  async function procesarVenta(estado: "pagada" | "pendiente") {
    if (cart.length === 0) { setError("Agrega productos al carrito"); return; }
    if (!clienteId) { setError("Selecciona un cliente"); return; }
    if (ncfAgotado) { setError(`La secuencia NCF ${ncfTipo} está agotada`); return; }
    setCargando(true);
    setError("");

    try {
      const items = cart.map((i) => ({
        producto_id: i.id,
        cantidad: i.cantidad,
        precio_unitario: i.precio,
        itbis_unitario: aplicarItbis && i.aplica_itbis ? i.itbis * i.precio : 0,
        subtotal: i.precio * i.cantidad,
      }));

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ncf_tipo: ncfTipo,
          cliente_id: clienteId,
          usuario_id: session?.user?.id,
          subtotal, itbis_total: itbisTotal, descuento, total,
          metodo_pago: metodoPago, estado, items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar venta");

      const cliente = clientes.find((c) => c.id === clienteId);
      setFacturaActual({
        ncf: data.ncf,
        ncf_tipo: ncfTipo,
        fecha: new Date().toISOString(),
        cliente: { nombre: cliente?.nombre || "", cedula_rnc: cliente?.cedula_rnc },
        vendedor: session?.user?.name || "",
        items: cart.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
          itbis_unitario: aplicarItbis && i.aplica_itbis ? i.itbis * i.precio : 0,
          subtotal: i.precio * i.cantidad,
        })),
        subtotal, itbis_total: itbisTotal, descuento, total,
        metodo_pago: metodoPago, estado,
      });
      setCart([]);
      setDescuento(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">Registra ventas con NCF fiscal automático</p>
        </div>
      </div>

      <div className="pos-layout">
        {/* Panel izquierdo: búsqueda de productos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0, flex: 1 }}>
          <div style={{ padding: 16, background: "white", border: "2px solid #000000" }}>
            <div className="search-bar" style={{ maxWidth: "100%" }}>
              <Search size={16} className="search-icon" />
              <input
                id="busqueda-producto"
                className="input"
                placeholder="BUSCAR PRODUCTO..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
                style={{ borderRadius: 0, border: "2px solid #000000", height: 48, fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: "hidden", border: "2px solid #000000", background: "white" }}>
            <div className="table-container" style={{ maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
                      {busqueda ? "No se encontraron productos" : "Escribe para buscar..."}
                    </td></tr>
                  ) : productos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                      <td><span className="badge badge-info">{p.codigo}</span></td>
                      <td style={{ color: "var(--success)", fontWeight: 600 }}>RD${p.precio.toFixed(2)}</td>
                      <td>
                        <span className={p.stock_actual === 0 ? "badge badge-danger" : p.stock_actual <= 5 ? "badge badge-warning" : "badge badge-success"}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td>
                        <button id={`add-${p.id}`} className="btn btn-primary btn-sm" disabled={p.stock_actual === 0} onClick={() => agregarProducto(p)}>
                          <Plus size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel derecho: carrito */}
        <div style={{ display: "flex", flexDirection: "column", padding: 20, gap: 16, border: "2px solid #000000", background: "white", overflow: "visible" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "black", color: "white", padding: "6px 12px", fontSize: 13, fontWeight: 800 }}>CARRITO</div>
            <span className="badge badge-purple" style={{ marginLeft: "auto", background: "black", color: "white", border: "1px solid black" }}>{cart.length} ITEMS</span>
          </div>

          {/* Items del carrito */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 150, maxHeight: 400 }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", gap: 8, border: "1px dashed #cbd5e1" }}>
                <ShoppingCart size={32} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Carrito Vacío</span>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="cart-item" style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{item.nombre}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>RD${item.precio.toFixed(2)}/U</div>
                </div>
                <div className="qty-control" style={{ background: "#f8fafc", padding: "4px" }}>
                  <button className="qty-btn" onClick={() => cambiarCantidad(item.id, -1)} style={{ width: 36, height: 36, fontSize: 18 }}>-</button>
                  <span style={{ fontSize: 15, fontWeight: 900, minWidth: 28, textAlign: "center" }}>{item.cantidad}</span>
                  <button className="qty-btn" onClick={() => cambiarCantidad(item.id, 1)} style={{ width: 36, height: 36, fontSize: 18 }}>+</button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#000000", minWidth: 80, textAlign: "right" }}>
                  RD${(item.precio * item.cantidad).toFixed(2)}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => removeItem(item.id)} style={{ padding: 10, background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 0 }}>
                  <Trash2 size={16} color="#e11d48" />
                </button>
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* Opciones */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label">Cliente</label>
              <select id="select-cliente" className="select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Tipo de Comprobante (NCF)</label>
              <select id="select-ncf" className="select" value={ncfTipo} onChange={(e) => setNcfTipo(e.target.value as NCFTipo)}>
                {Object.entries(NCF_LABELS).map(([k, v]) => {
                  const seq = ncfSecuencias.find((n) => n.tipo === k);
                  const agotado = seq && seq.secuencia_actual > seq.secuencia_fin;
                  return <option key={k} value={k} disabled={Boolean(agotado)}>{v} ({k}){agotado ? " - AGOTADO" : ""}</option>;
                })}
              </select>
              {ncfActual && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Próximo: {ncfActual.prefix}{String(ncfActual.secuencia_actual).padStart(8, "0")} | Disponibles: {ncfActual.secuencia_fin - ncfActual.secuencia_actual + 1}
                </div>
              )}
            </div>

            <div>
              <label className="label">Método de pago</label>
              <select id="select-pago" className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="efectivo">💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="credito">📋 Crédito</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                Aplicar ITBIS (18%)
              </label>
            </div>

            <div>
              <label className="label">Descuento (RD$)</label>
              <input className="input" type="number" min={0} value={descuento} onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Totales */}
          <div className="glass" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Subtotal</span><span>RD${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
              <span>ITBIS</span><span>RD${itbisTotal.toFixed(2)}</span>
            </div>
            {descuento > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--danger)" }}>
              <span>Descuento</span><span>-RD${descuento.toFixed(2)}</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, marginTop: 8, color: "var(--success)" }}>
              <span>TOTAL</span><span>RD${total.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", color: "#f87171", fontSize: 13 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button id="btn-cobrar" className="btn btn-success" disabled={cargando || cart.length === 0} onClick={() => procesarVenta("pagada")} style={{ justifyContent: "center" }}>
              {cargando ? "Procesando..." : "✓ Cobrar"}
            </button>
            <button id="btn-credito" className="btn btn-ghost" disabled={cargando || cart.length === 0} onClick={() => procesarVenta("pendiente")} style={{ justifyContent: "center" }}>
              📋 A Crédito
            </button>
          </div>
        </div>
      </div>

      {/* Modal de factura generada */}
      {facturaActual && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>✅ Venta Completada — {facturaActual.ncf}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setFacturaActual(null)}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button id="btn-print-a4" className="btn btn-primary" onClick={() => { setModoPrint("a4"); setTimeout(handlePrint, 100); }}>
                <Printer size={16} /> Imprimir A4
              </button>
              <button id="btn-print-termica" className="btn btn-ghost" onClick={() => { setModoPrint("termica"); setTimeout(handlePrint, 100); }}>
                <Printer size={16} /> Térmica 80mm
              </button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "auto", maxHeight: 500 }}>
              <PrintInvoice ref={printRef} data={facturaActual} modo={modoPrint} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setFacturaActual(null)}>Nueva Venta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
