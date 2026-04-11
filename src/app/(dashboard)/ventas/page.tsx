"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useReactToPrint } from "react-to-print";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Check, CreditCard } from "lucide-react";
import { PrintInvoice, type InvoiceData } from "@/components/PrintInvoice";
import { NCF_LABELS, type NCFTipo } from "@/lib/ncf";

interface Producto { id: string; codigo: string; nombre: string; laboratorio?: string; precio: number; precioOriginal?: number; costo?: number; itbis: number; aplica_itbis: boolean; stock_actual: number; }
interface CartItem extends Producto { cantidad: number; precioOriginal: number; }
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
  const [modalManual, setModalManual] = useState(false);
  const [manualItem, setManualItem] = useState({ nombre: "", precio: "" });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const buscarProductos = useCallback(async (q: string) => {
    const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}&limit=15`);
    const result = await res.json();
    setProductos(result.data ? result.data : (Array.isArray(result) ? result : []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscarProductos(busqueda), 250);
    return () => clearTimeout(timer);
  }, [busqueda, buscarProductos]);

  useEffect(() => { if (facturaActual) setTimeout(() => handlePrint(), 400); }, [facturaActual, handlePrint]);

  useEffect(() => {
    Promise.all([fetch("/api/clientes").then(r=>r.json()), fetch("/api/ncf-secuencias").then(r=>r.json())]).then(([cls, ncfs]) => {
      setClientes(Array.isArray(cls) ? cls : []); setNcfSecuencias(Array.isArray(ncfs) ? ncfs : []);
      if (Array.isArray(cls) && cls.length > 0) setClienteId(cls[0].id);
    });
  }, []);

  function agregarProducto(p: Producto) {
    setCart((prev) => {
      const existe = prev.find((i) => i.id === p.id);
      if (existe) return existe.cantidad >= p.stock_actual ? prev : prev.map((i) => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...p, cantidad: 1, precioOriginal: p.precio }];
    });
  }

  function cambiarPrecio(id: string, nuevoPrecio: number) {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, precio: Math.max(0, nuevoPrecio) } : i));
  }

  function agregarProductoManual() {
    if (!manualItem.nombre || Number(manualItem.precio) <= 0) return;
    const p = Number(manualItem.precio);
    const itemManual: Producto = {
       id: "manual-" + Date.now(),
       codigo: "MANUAL",
       nombre: manualItem.nombre,
       precio: p,
       precioOriginal: p,
       costo: 0,
       itbis: 0.18,
       aplica_itbis: aplicarItbis,
       stock_actual: 9999
    };
    agregarProducto(itemManual);
    setModalManual(false);
    setManualItem({ nombre: "", precio: "" });
  }

  function cambiarCantidad(id: string, delta: number) { setCart((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: Math.max(1, Math.min(i.cantidad + delta, i.stock_actual)) } : i)); }
  function removeItem(id: string) { setCart((prev) => prev.filter((i) => i.id !== id)); }

  const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const itbisTotal = aplicarItbis ? cart.reduce((s, i) => s + (i.aplica_itbis ? i.itbis * i.precio * i.cantidad : 0), 0) : 0;
  const descuentoVal = Math.min(descuento, subtotal + itbisTotal);
  const total = Math.max(0, subtotal + itbisTotal - descuentoVal);
  const ncfActual = ncfSecuencias.find((n) => n.tipo === ncfTipo);
  const ncfAgotado = ncfActual && ncfActual.secuencia_actual > ncfActual.secuencia_fin;

  async function procesarVenta(estado: "pagada" | "pendiente") {
    if (cart.length === 0) { setError("El carrito está vacío"); return; }
    if (!clienteId) { setError("Seleccione un cliente"); return; }
    if (ncfAgotado) { setError("Secuencia NCF agotada"); return; }
    setCargando(true); setError("");

    try {
      const totalCosto = cart.reduce((s, i) => s + (i.costo || 0) * i.cantidad, 0);
      const gananciaTotal = subtotal - totalCosto;

      const items = cart.map((i) => ({ producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio, costo_unitario: i.costo || 0, itbis_unitario: aplicarItbis && i.aplica_itbis ? i.itbis * i.precio : 0, subtotal: i.precio * i.cantidad }));
      const payload = { ncf_tipo: ncfTipo, cliente_id: clienteId, usuario_id: session?.user?.id, subtotal, itbis_total: itbisTotal, descuento: descuentoVal, total, metodo_pago: metodoPago, estado, costo_total: totalCosto, ganancia: gananciaTotal - descuentoVal, items };
      const res = await fetch("/api/facturas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Error al procesar");

      const cliente = clientes.find((c) => c.id === clienteId);
      setFacturaActual({ ncf: data.ncf, ncf_tipo: ncfTipo, fecha: new Date().toISOString(), cliente: { nombre: cliente?.nombre || "", cedula_rnc: cliente?.cedula_rnc }, vendedor: session?.user?.name || "", items: cart.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio, itbis_unitario: aplicarItbis && i.aplica_itbis ? i.itbis * i.precio : 0, subtotal: i.precio * i.cantidad })), subtotal, itbis_total: itbisTotal, descuento: descuentoVal, total, metodo_pago: metodoPago, estado });
      setCart([]);
      setDescuento(0);
    } catch (err: any) { setError(err.message); } finally { setCargando(false); }
  }

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 60, paddingTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">Terminal de Pago</p>
        </div>
      </div>

      <div className="pos-container">

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input" placeholder="Buscar por código de barras o nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ paddingLeft: 44, padding: "16px 16px 16px 44px", fontSize: 16, background: "white", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }} />
            </div>
            <button className="btn btn-outline hover-lift" onClick={() => setModalManual(true)} style={{ height: 56, background: "white", fontWeight: 700, padding: "0 24px" }}>
              <Plus size={16} /> Artículo Manual
            </button>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
             <table className="datagrid">
               <thead><tr><th>SKU</th><th>Medicamento</th><th>Precio</th><th>Stock</th><th></th></tr></thead>
               <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => agregarProducto(p)}>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{p.codigo}</td>
                      <td style={{ fontWeight: 500 }}>
                        <div>{p.nombre}</div>
                        {p.laboratorio && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>{p.laboratorio}</div>}
                      </td>
                      <td style={{ fontWeight: 500 }}>RD${p.precio.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${p.stock_actual <= p.stock_minimo ? 'badge-danger' : 'badge-neutral'}`}>
                           {p.stock_actual > 0 ? p.stock_actual : "Agotado"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-outline" style={{ padding: "4px 8px" }}><Plus size={14}/></button></td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 24 }}>
           <div>
             <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                <span>Nuevo Recibo</span>
                <span className="badge badge-neutral">{cart.length}</span>
             </h3>
           </div>

           <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
             {cart.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Añada medicamentos al recibo para continuar.</div>
             ) : cart.map((item) => {
               const rebajado = item.precio < item.precioOriginal;
               return (
                <div key={item.id} style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  {/* Fila 1: Nombre + eliminar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 8 }}>
                      {item.nombre}
                      {item.laboratorio && <span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 6 }}>({item.laboratorio})</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="btn btn-ghost" style={{ padding: 4, color: "var(--danger)", flexShrink: 0 }}><Trash2 size={13}/></button>
                  </div>
                  {/* Fila 2: precio editable + cantidad + subtotal */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ position: "relative", width: 90 }}>
                      <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)" }}>RD$</span>
                      <input
                        type="number" min="0" step="any"
                        value={item.precio ?? ""}
                        onChange={(e) => cambiarPrecio(item.id, e.target.value === "" ? (undefined as any) : parseFloat(e.target.value))}
                        style={{ width: "100%", padding: "4px 4px 4px 28px", fontSize: 12, border: `1px solid ${rebajado ? "var(--danger)" : "var(--border)"}`, borderRadius: 5, outline: "none", background: rebajado ? "#fff5f5" : "white" }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>×</span>
                    <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, -1); }} className="btn btn-ghost" style={{ padding: "2px 5px", fontSize: 12 }}><Minus size={12}/></button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.cantidad}</span>
                    <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(item.id, 1); }} className="btn btn-ghost" style={{ padding: "2px 5px", fontSize: 12 }}><Plus size={12}/></button>
                    <span style={{ fontSize: 12, fontWeight: 500, marginLeft: "auto", color: rebajado ? "var(--danger)" : "var(--text-main)" }}>
                      RD${(item.precio * item.cantidad).toLocaleString()}
                    </span>
                  </div>
                  {rebajado && (
                    <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 2 }}>
                      Precio original: RD${item.precioOriginal.toLocaleString()} · Rebaja: RD${((item.precioOriginal - item.precio) * item.cantidad).toLocaleString()}
                    </div>
                  )}
                </div>
               );
             })}
           </div>

           <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                <span>Subtotal</span><span>RD${subtotal.toLocaleString()}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6, alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>ITBIS (18%) <input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} /></span>
                <span>RD${itbisTotal.toLocaleString()}</span>
             </div>
             {/* Descuento global */}
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--danger)", marginBottom: 10, alignItems: "center", gap: 8 }}>
               <span style={{ flexShrink: 0 }}>Descuento (RD$)</span>
               <input
                 type="number" min="0" step="any"
                 value={descuento ?? ""}
                 placeholder="0.00"
                 onChange={(e) => setDescuento(e.target.value === "" ? (undefined as any) : parseFloat(e.target.value))}
                 style={{ width: 90, padding: "4px 8px", fontSize: 13, border: "1px solid var(--danger)", borderRadius: 5, outline: "none", textAlign: "right", color: "var(--danger)", background: descuentoVal > 0 ? "#fff5f5" : "white" }}
               />
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: "var(--text-main)", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <span>Total</span><span>RD${total.toLocaleString()}</span>
             </div>
           </div>

           <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <div>
                <label className="label">Cliente</label>
                <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
             </div>
             <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                   <label className="label">Método</label>
                   <select className="input" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                     <option value="efectivo">Efectivo</option>
                     <option value="tarjeta">Tarjeta</option>
                     <option value="transferencia">Transferencia</option>
                     <option value="credito">Crédito</option>
                   </select>
                </div>
                <div style={{ flex: 1 }}>
                   <label className="label">NCF</label>
                   <select className="input" value={ncfTipo} onChange={(e) => setNcfTipo(e.target.value as NCFTipo)}>
                     {Object.entries(NCF_LABELS).map(([k, v]) => {
                       const act = ncfSecuencias.find((n) => n.tipo === k);
                       const disabled = !act || act.secuencia_actual > act.secuencia_fin;
                       return <option key={k} value={k} disabled={disabled}>{disabled ? `${k} (Agotado/No Configurado)` : v}</option>;
                     })}
                   </select>
                </div>
             </div>
             {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 500, padding: "8px 12px", background: "#fee2e2", borderRadius: 6 }}>{error}</div>}
             {(!ncfActual || ncfActual.secuencia_actual > ncfActual.secuencia_fin) && (
               <div style={{ color: "#d97706", fontSize: 13, fontWeight: 500, padding: "8px 12px", background: "#fef3c7", borderRadius: 6 }}>
                 ⚠️ Debe configurar o asignar secuencias NCF para {NCF_LABELS[ncfTipo]} en Configuración.
               </div>
             )}
             <button className="btn btn-primary shadow-sm hover-lift" style={{ height: 44, width: "100%", fontSize: 14 }} onClick={() => procesarVenta(metodoPago === "credito" ? "pendiente" : "pagada")} disabled={cargando || !ncfActual || ncfActual.secuencia_actual > ncfActual.secuencia_fin || cart.length === 0}>
               {cargando ? "Procesando..." : (metodoPago === "credito" ? `Fiar RD$${total.toLocaleString()}` : `Cobrar RD$${total.toLocaleString()}`)}
             </button>
           </div>
        </div>
      </div>

      {facturaActual && (
        <div className="modal-overlay">
          <div style={{ background: "#ffffff", borderRadius: 12, maxWidth: 380, width: "100%", textAlign: "center", padding: 32, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 48, height: 48, background: "#dcfce7", color: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Check size={24} /></div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Transacción Aprobada</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>NCF Asignado: {facturaActual.ncf}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handlePrint()}><Printer size={16} /> Imprimir Recibo</button>
              <button className="btn btn-outline" onClick={() => setFacturaActual(null)}>Nueva Venta</button>
            </div>
            <div style={{ display: "none" }}><PrintInvoice ref={printRef} data={facturaActual} modo="termica" /></div>
          </div>
        </div>
      )}

      {modalManual && (
        <div className="modal-overlay">
          <div style={{ background: "#ffffff", borderRadius: 12, maxWidth: 400, width: "100%", padding: 32, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 24, letterSpacing: "-0.02em" }}>Agregar Artículo Libre</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
               <div>
                  <label className="label">Descripción Personalizada</label>
                  <input className="input" value={manualItem.nombre} onChange={e => setManualItem({...manualItem, nombre: e.target.value})} placeholder="Ej. Empaque Extra" />
               </div>
               <div>
                  <label className="label">Precio Unitario (RD$)</label>
                  <input className="input" type="number" min="0" step="any" value={manualItem.precio} onChange={e => setManualItem({...manualItem, precio: e.target.value})} placeholder="0.00" />
               </div>
               <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => setModalManual(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={agregarProductoManual} disabled={!manualItem.nombre || Number(manualItem.precio) <= 0} style={{ flex: 1 }}>Añadir al Ticket</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
