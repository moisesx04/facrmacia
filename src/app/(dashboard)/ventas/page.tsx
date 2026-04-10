"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useReactToPrint } from "react-to-print";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, AlertCircle, X, Check, Zap } from "lucide-react";
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
      {/* HEADER POS V7 */}
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">RADIANT ELITE V7.0 • ALTA VISIBILIDAD</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="glass" style={{ padding: "8px 24px", borderRadius: 16, display: "flex", alignItems: "center", gap: 12, background: "white" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)" }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: "#10b981" }}>CAJA ACTIVA</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 32, alignItems: "start" }}>
        
        {/* PANEL IZQUIERDO: BUSCADOR Y LISTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div className="glass" style={{ padding: 16, borderRadius: 24, background: "white" }}>
             <div style={{ position: "relative" }}>
               <Search size={22} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", color: "#6366f1" }} />
               <input className="input" placeholder="Buscar medicina por nombre o código..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
                 style={{ paddingLeft: 64, height: 64, borderRadius: 18, fontSize: 16, border: "none", background: "#f8fafc" }} />
             </div>
          </div>

          <div className="glass" style={{ borderRadius: 32, overflow: "hidden", border: "1px solid #e2e8f0", background: "white" }}>
            <div className="table-container" style={{ maxHeight: "calc(100vh - 400px)", overflowY: "auto", padding: "0 16px" }}>
              <table className="table-v7">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Venta</th>
                    <th>Sotck</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} className="hover-lift" style={{ cursor: "pointer" }} onClick={() => agregarProducto(p)}>
                      <td>
                        <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 15 }}>{p.nombre.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 800, marginTop: 4 }}>COD: {p.codigo}</div>
                      </td>
                      <td>
                        <div style={{ color: "#0f172a", fontWeight: 950, fontSize: 16 }}>RD${p.precio.toLocaleString()}</div>
                      </td>
                      <td>
                         <span style={{ 
                            padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900,
                            background: p.stock_actual <= 5 ? "#fff1f2" : "#f0fdf4",
                            color: p.stock_actual <= 5 ? "#ef4444" : "#10b981",
                            border: `1px solid ${p.stock_actual <= 5 ? "#fecaca" : "#dcfce7"}`
                          }}>
                            {p.stock_actual}
                         </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
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

        {/* PANEL DERECHO: CARRITO RADIANT */}
        <div className="glass" style={{ display: "flex", flexDirection: "column", padding: 32, borderRadius: 40, gap: 28, background: "white", border: "1px solid #e2e8f0", position: "sticky", top: 32 }}>
           <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
             <h3 style={{ fontSize: 22, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>Resumen</h3>
             <span style={{ fontSize: 13, fontWeight: 900, color: "#6366f1" }}>{cart.length} ITEMS</span>
           </div>

           <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
             {cart.length === 0 ? (
               <div style={{ padding: "60px 0", textAlign: "center", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 16 }}>
                 <ShoppingCart size={56} style={{ margin: "0 auto", opacity: 0.3 }} />
                 <span style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase" }}>Carrito Vacío</span>
               </div>
             ) : cart.map((item) => (
               <div key={item.id} className="fade-in" style={{ display: "flex", gap: 12, padding: "16px", background: "#f8fafc", borderRadius: 20, border: "1px solid #f1f5f9" }}>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{item.nombre.toUpperCase()}</div>
                   <div style={{ fontSize: 11, fontWeight: 800, color: "#6366f1" }}>RD${item.precio.toLocaleString()} / Ud.</div>
                 </div>
                 <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 12, padding: "2px 8px", border: "1px solid #e2e8f0" }}>
                   <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, -1); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}><Minus size={14} /></button>
                   <span style={{ fontWeight: 950, fontSize: 13, color: "#0f172a" }}>{item.cantidad}</span>
                   <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, 1); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}><Plus size={14} /></button>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "#fff1f2", color: "#ef4444", border: "none" }}>
                   <Trash2 size={14} />
                 </button>
               </div>
             ))}
           </div>

           <div style={{ background: "#f8fafc", padding: 24, borderRadius: 28, border: "2px dashed #e2e8f0" }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#64748b", marginBottom: 12 }}>
               <span>SUBTOTAL</span>
               <span style={{ color: "#0f172a" }}>RD${subtotal.toLocaleString()}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#64748b", marginBottom: 16 }}>
               <span>ITBIS (18%)</span>
               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                 <input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
                 <span style={{ color: "#0f172a" }}>RD${itbisTotal.toLocaleString()}</span>
               </div>
             </div>
             <div style={{ height: 1, background: "#e2e8f0", margin: "0 -24px 20px" }} />
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
               <span style={{ fontSize: 14, fontWeight: 950, color: "#6366f1" }}>TOTAL</span>
               <span style={{ fontSize: 32, fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>RD${total.toLocaleString()}</span>
             </div>
           </div>

           <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                   <label className="label">CLIENTE</label>
                   <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ padding: "0 12px", height: 48 }}>
                     {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                   </select>
                </div>
                <div>
                   <label className="label">MÉTODO</label>
                   <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ padding: "0 12px", height: 48 }}>
                     <option value="efectivo">EFECTIVO</option>
                     <option value="tarjeta">TARJETA</option>
                     <option value="transferencia">TRANSFER.</option>
                     <option value="credito">CRÉDITO</option>
                   </select>
                </div>
             </div>

             <button className="btn btn-primary hover-lift" onClick={() => procesarVenta("pagada")} disabled={cargando || ncfAgotado} 
               style={{ width: "100%", height: 64, borderRadius: 20, fontSize: 15, fontWeight: 900 }}>
               {cargando ? "PROCESANDO..." : "VINCULAR Y FACTURAR"}
             </button>
           </div>
        </div>
      </div>

      {facturaActual && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420, textAlign: "center", padding: 48, borderRadius: 40, background: "white" }}>
            <div style={{ width: 72, height: 72, background: "#f0fdf4", color: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: "4px solid #dcfce7" }}>
              <Check size={36} />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 950, color: "#0f172a", marginBottom: 8 }}>Venta Completada</h2>
            <p style={{ color: "#64748b", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 32 }}>NCF: {facturaActual.ncf}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn btn-primary" onClick={() => handlePrint()} style={{ height: 56, borderRadius: 16 }}>
                <Printer size={20} /> IMPRIMIR TICKET
              </button>
              <button className="btn btn-ghost" onClick={() => setFacturaActual(null)} style={{ height: 52, borderRadius: 16 }}>
                NUEVA VENTA
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
