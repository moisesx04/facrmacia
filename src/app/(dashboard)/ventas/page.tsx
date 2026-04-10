"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useReactToPrint } from "react-to-print";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, AlertCircle, X, Check } from "lucide-react";
import { PrintInvoice, type InvoiceData } from "@/components/PrintInvoice";
import { NCF_LABELS, type NCFTipo } from "@/lib/ncf";
import Link from "next/link";

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
    if (facturaActual) {
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [facturaActual, handlePrint]);

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
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 900, letterSpacing: "-0.05em", color: "#000" }}>Punto de Venta</h1>
          <p className="page-subtitle" style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>TERMINAL DE FACTURACIÓN RÁPIDA</p>
        </div>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", 
        gap: 24,
        alignItems: "start"
      }}>
        {/* Lado Izquierdo: Buscador y Productos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="glass" style={{ padding: 16, borderRadius: 18 }}>
            <div className="search-bar" style={{ maxWidth: "100%" }}>
              <Search size={18} className="search-icon" color="#6366f1" />
              <input className="input" placeholder="Buscar medicamento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
                style={{ height: 44, fontSize: 13, paddingLeft: 42, borderRadius: 10, border: "2px solid #eff6ff" }} />
            </div>
          </div>

          <div className="glass" style={{ flex: 1, overflow: "hidden", borderRadius: 24, display: "flex", flexDirection: "column" }}>
            <div className="table-container" style={{ flex: 1, overflowY: "auto", border: "none" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "16px 24px" }}>PRODUCTO</th>
                    <th style={{ padding: "16px 24px" }}>PRECIO</th>
                    <th style={{ padding: "16px 24px" }}>STOCK</th>
                    <th style={{ padding: "16px 24px", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{p.nombre.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>CÓD.: {p.codigo}</div>
                      </td>
                      <td style={{ padding: "16px 24px", color: "#6366f1", fontWeight: 800 }}>RD${p.precio.toLocaleString()}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ 
                          padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 900,
                          background: p.stock_actual <= 5 ? "#fffbeb" : "#f0fdf4",
                          color: p.stock_actual <= 5 ? "#d97706" : "#10b981"
                        }}>
                          {p.stock_actual} UNID.
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <button className="btn btn-primary btn-sm" disabled={p.stock_actual === 0} onClick={() => agregarProducto(p)} style={{ padding: 12, borderRadius: 12 }}>
                          <Plus size={18} />
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
        <div className="glass" style={{ display: "flex", flexDirection: "column", padding: 32, borderRadius: 32, gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Dalle de Venta</h3>
            <span style={{ background: "#6366f1", color: "white", padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900 }}>{cart.length} ITEMS</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 16 }}>
                <ShoppingCart size={48} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>CARRITO VACÍO</span>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: 16, padding: 16, background: "#f8fafc", borderRadius: 20, border: "1px solid #eff6ff" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{item.nombre.toUpperCase()}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>RD${item.precio.toLocaleString()} / UNID.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 12, padding: "4px 8px", border: "1px solid #e2e8f0" }}>
                  <button onClick={() => cambiarCantidad(item.id, -1)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}><Minus size={14} /></button>
                  <span style={{ fontWeight: 900, minWidth: 20, textAlign: "center" }}>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.id, 1)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}><Plus size={14} /></button>
                </div>
                <button onClick={() => removeItem(item.id)} style={{ padding: 10, borderRadius: 12, background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: "#f8fafc", padding: 24, borderRadius: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#64748b" }}>
              <span>SUBTOTAL</span>
              <span>RD${subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#64748b" }}>
              <span>ITBIS (18%)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#6366f1" }} />
                <span>RD${itbisTotal.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ height: 2, background: "#eff6ff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>TOTAL A PAGAR</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: "#6366f1" }}>RD${total.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                   <label style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", display: "block", marginBottom: 8 }}>CLIENTE</label>
                   <select className="select" value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ borderRadius: 14, height: 48, background: "#f8fafc", border: "2px solid #eff6ff" }}>
                     {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                   </select>
                </div>
                <div>
                   <label style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", display: "block", marginBottom: 8 }}>MÉTODO DE PAGO</label>
                   <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ borderRadius: 14, height: 48, background: "#f8fafc", border: "2px solid #eff6ff" }}>
                     <option value="efectivo">💵 EFECTIVO</option>
                     <option value="tarjeta">💳 TARJETA</option>
                     <option value="transferencia">🏦 TRANSFER.</option>
                     <option value="credito">📋 CRÉDITO</option>
                   </select>
                </div>
             </div>

             <div style={{ position: "relative" }}>
                <label style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", display: "block", marginBottom: 8 }}>TIPO DE COMPROBANTE (NCF)</label>
                <select className="select" value={ncfTipo} onChange={(e) => setNcfTipo(e.target.value as NCFTipo)} style={{ borderRadius: 14, height: 48, background: "#f8fafc", border: "2px solid #eff6ff" }}>
                  {Object.entries(NCF_LABELS).map(([k, v]) => {
                    const seq = ncfSecuencias.find((n) => n.tipo === k);
                    const agotado = seq && seq.secuencia_actual > seq.secuencia_fin;
                    return <option key={k} value={k} disabled={Boolean(agotado)}>{v} ({k}){agotado ? " - AGOTADO" : ""}</option>;
                  })}
                </select>
             </div>

             {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: 12, borderRadius: 12, fontSize: 12, fontWeight: 800, textAlign: "center" }}>⚠️ {error.toUpperCase()}</div>}

             <button id="btn-finalizar" className="btn btn-primary" onClick={() => procesarVenta("pagada")} disabled={cargando || ncfAgotado} 
              style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 14, fontWeight: 900 }}>
              {cargando ? "PROCESANDO..." : "✓ COMPLETAR VENTA"}
            </button>
          </div>
        </div>
      </div>

      {facturaActual && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 450, borderRadius: 32, padding: 40 }}>
            <div className="modal-header">
              <span style={{ background: "#f0fdf4", color: "#10b981", padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900 }}>EXITO</span>
              <button onClick={() => setFacturaActual(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 80, height: 80, background: "#f0fdf4", color: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Check size={40} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{facturaActual.ncf}</div>
              <p style={{ fontSize: 14, color: "#64748b", fontWeight: 500, marginTop: 8 }}>Ticket térmico enviado a la cola de impresión.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn btn-primary" onClick={() => handlePrint()} style={{ height: 56, borderRadius: 16, fontWeight: 900 }}>
                <Printer size={20} /> RE-IMPRIMIR TICKET
              </button>
              <button className="btn btn-ghost" onClick={() => setFacturaActual(null)} style={{ height: 52, borderRadius: 16, fontWeight: 800 }}>
                CERRAR Y NUEVA VENTA
              </button>
            </div>

            <div style={{ display: "none" }}>
              <PrintInvoice ref={printRef} data={facturaActual} modo="termica" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
