"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useReactToPrint } from "react-to-print";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, AlertCircle, X, Check, Zap, CreditCard } from "lucide-react";
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
    const timer = setTimeout(() => {
      buscarProductos(busqueda);
    }, 300);
    return () => clearTimeout(timer);
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
    <div className="fade-in" style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 60 }}>
      {/* HEADER V6 POS */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">TERMINAL ULTRA-VIBRANTE V6.0</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div className="glass" style={{ padding: "12px 24px", borderRadius: 20, display: "flex", alignItems: "center", gap: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 15px #10b981" }} />
            <span style={{ fontSize: 13, fontWeight: 950, color: "#10b981", letterSpacing: "0.05em" }}>CAJA ACTIVA</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 32, alignItems: "start" }}>
        
        {/* PANEL IZQUIERDO: BUSCADOR Y PRODUCTOS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 32, background: "rgba(15, 23, 42, 0.4)" }}>
            <div style={{ position: "relative" }}>
              <Search size={22} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", color: "#6366f1" }} />
              <input className="input" placeholder="Escribe el nombre de la medicina o código..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
                style={{ paddingLeft: 64, height: 64, borderRadius: 20, fontSize: 16, background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>

          <div className="glass" style={{ borderRadius: 40, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div className="table-container" style={{ maxHeight: "calc(100vh - 400px)", overflowY: "auto", padding: "0 16px" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
                <thead>
                  <tr>
                    <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", fontSize: 11, padding: 20, border: "none" }}>PRODUCTO</th>
                    <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", fontSize: 11, padding: 20, border: "none" }}>PRECIO</th>
                    <th style={{ color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", fontSize: 11, padding: 20, border: "none" }}>STOCK</th>
                    <th style={{ color: "#94a3b8", border: "none" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} className="hover-lift" style={{ cursor: "pointer", background: "rgba(30, 41, 59, 0.5)", borderRadius: 20 }} onClick={() => agregarProducto(p)}>
                      <td style={{ padding: "20px", borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }}>
                        <div style={{ fontWeight: 950, color: "white", fontSize: 15 }}>{p.nombre.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 900, marginTop: 4 }}>COD: {p.codigo}</div>
                      </td>
                      <td style={{ padding: "20px" }}>
                        <div style={{ color: "white", fontWeight: 950, fontSize: 18 }}>RD${p.precio.toLocaleString()}</div>
                      </td>
                      <td style={{ padding: "20px" }}>
                        <div style={{ 
                          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 12, fontSize: 11, fontWeight: 950,
                          background: p.stock_actual <= 5 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                          color: p.stock_actual <= 5 ? "#ef4444" : "#10b981",
                          border: `1px solid ${p.stock_actual <= 5 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 10px currentColor" }} />
                          {p.stock_actual} STOCK
                        </div>
                      </td>
                      <td style={{ padding: "20px", textAlign: "right", borderTopRightRadius: 20, borderBottomRightRadius: 20 }}>
                        <button className="btn btn-primary" style={{ width: 44, height: 44, padding: 0, borderRadius: 14 }}>
                          <Plus size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: CARRITO / RECIBO ULTRA-VIBRANTE */}
        <div className="glass" style={{ display: "flex", flexDirection: "column", padding: 40, borderRadius: 48, gap: 32, position: "sticky", top: 32, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(15, 23, 42, 0.9)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 24, fontWeight: 950, color: "white", letterSpacing: "-0.04em" }}>Orden</h3>
            <span style={{ fontSize: 12, fontWeight: 950, color: "#6366f1", background: "rgba(99, 102, 241, 0.15)", padding: "4px 12px", borderRadius: 10 }}>{cart.length} ITEMS</span>
          </div>

          <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {cart.length === 0 ? (
              <div style={{ padding: "80px 0", textAlign: "center", color: "#475569", display: "flex", flexDirection: "column", gap: 20 }}>
                <ShoppingCart size={64} style={{ margin: "0 auto", opacity: 0.2 }} />
                <span style={{ fontSize: 13, fontWeight: 950, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em" }}>Carrido Vacío</span>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="fade-in" style={{ display: "flex", gap: 16, padding: "24px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "white" }}>{item.nombre.toUpperCase()}</div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#6366f1", marginTop: 4 }}>RD${item.precio.toLocaleString()} / Ud.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(15, 23, 42, 0.8)", borderRadius: 14, padding: "4px 10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, -1); }} style={{ border: "none", background: "none", cursor: "pointer", color: "white" }}><Minus size={14} /></button>
                  <span style={{ fontWeight: 950, fontSize: 14, minWidth: 24, textAlign: "center", color: "white" }}>{item.cantidad}</span>
                  <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, 1); }} style={{ border: "none", background: "none", cursor: "pointer", color: "white" }}><Plus size={14} /></button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))", padding: 32, borderRadius: 32, border: "1px dashed rgba(255,255,255,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, color: "#94a3b8", marginBottom: 14 }}>
              <span>SUBTOTAL</span>
              <span style={{ color: "white" }}>RD${subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, color: "#94a3b8", marginBottom: 20 }}>
              <span>ITBIS (18%)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#6366f1" }} />
                <span style={{ color: "white" }}>RD${itbisTotal.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "0 -32px 24px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 950, color: "#6366f1" }}>TOTAL APAGAR</span>
              <span style={{ fontSize: 36, fontWeight: 950, color: "white", letterSpacing: "-0.05em", filter: "drop-shadow(0 0 10px rgba(99,102,241,0.5))" }}>RD${total.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                   <label className="label">CLIENTE</label>
                   <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ padding: "0 16px", height: 52 }}>
                     {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                   </select>
                </div>
                <div>
                   <label className="label">MÉTODO PAGO</label>
                   <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ padding: "0 16px", height: 52 }}>
                     <option value="efectivo">EFECTIVO</option>
                     <option value="tarjeta">TARJETA</option>
                     <option value="transferencia">TRANSFER.</option>
                     <option value="credito">CRÉDITO</option>
                   </select>
                </div>
             </div>

             <div>
                <label className="label">COMPROBANTE FISCAL (NCF)</label>
                <select className="input" value={ncfTipo} onChange={(e) => setNcfTipo(e.target.value as NCFTipo)} style={{ height: 52 }}>
                  {Object.entries(NCF_LABELS).map(([k, v]) => {
                    const seq = ncfSecuencias.find((n) => n.tipo === k);
                    const agotado = seq && seq.secuencia_actual > seq.secuencia_fin;
                    return <option key={k} value={k} disabled={Boolean(agotado)}>{v} ({k})</option>;
                  })}
                </select>
             </div>

             {error && <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "16px", borderRadius: 16, fontSize: 12, fontWeight: 950, border: "1px solid rgba(239, 68, 68, 0.3)" }}>⚠️ {error.toUpperCase()}</div>}

             <button id="btn-finalizar" className="btn btn-primary hover-lift" onClick={() => procesarVenta("pagada")} disabled={cargando || ncfAgotado} 
              style={{ width: "100%", height: 72, borderRadius: 24, fontSize: 18, fontWeight: 950, letterSpacing: "0.05em" }}>
              {cargando ? "PROCESANDO..." : "VINCULAR Y FACTURAR"}
            </button>
          </div>
        </div>
      </div>

      {facturaActual && (
        <div className="modal-overlay">
          <div className="glass" style={{ maxWidth: 460, textAlign: "center", padding: 60, borderRadius: 48, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <div style={{ width: 80, height: 80, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", border: "1px solid rgba(16, 185, 129, 0.4)", boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)" }}>
              <Check size={40} />
            </div>
            
            <h2 style={{ fontSize: 32, fontWeight: 950, color: "white", marginBottom: 12, letterSpacing: "-0.05em" }}>Venta Exitosa</h2>
            <p style={{ color: "#10b981", fontWeight: 950, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 40 }}>NCF: {facturaActual.ncf}</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button className="btn btn-primary" onClick={() => handlePrint()} style={{ height: 64, borderRadius: 20 }}>
                <Printer size={22} /> IMPRIMIR RECIBO
              </button>
              <button className="btn btn-ghost" onClick={() => setFacturaActual(null)} style={{ height: 60, borderRadius: 20 }}>
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
