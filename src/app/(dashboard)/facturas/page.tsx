"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Search, Printer, XCircle, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import { PrintInvoice, type InvoiceData } from "@/components/PrintInvoice";

interface Factura {
  id: string; ncf: string; ncf_tipo: string; subtotal: number; itbis_total: number;
  descuento: number; total: number; metodo_pago: string; estado: string; created_at: string;
  clientes: { nombre: string; cedula_rnc?: string };
  usuarios: { nombre: string };
  factura_items: { cantidad: number; precio_unitario: number; itbis_unitario: number; subtotal: number; productos: { nombre: string; codigo: string } }[];
}

const ESTADO_BADGE: Record<string, string> = { pagada: "badge-success", pendiente: "badge-warning", anulada: "badge-danger" };

export default function FacturasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [estado, setEstado] = useState("");
  const [facturaView, setFacturaView] = useState<Factura | null>(null);
  const [modoPrint, setModoPrint] = useState<"a4" | "termica">("a4");
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  async function cargar() {
    setLoading(true);
    const params = new URLSearchParams({ desde, hasta, limit: "200" });
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/facturas?${params}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    const filtered = busqueda
      ? arr.filter((f: Factura) => f.ncf?.toLowerCase().includes(busqueda.toLowerCase()) || f.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
      : arr;
    setFacturas(filtered);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [desde, hasta, estado]);

  async function anular(id: string) {
    if (!confirm("¿Anular esta factura? Se devolverá el stock automáticamente.")) return;
    const res = await fetch(`/api/facturas/${id}/anular`, { method: "POST" });
    if (res.ok) cargar();
    else {
      const d = await res.json();
      alert(d.error || "Error al anular");
    }
  }

  function toInvoiceData(f: Factura): InvoiceData {
    return {
      ncf: f.ncf, ncf_tipo: f.ncf_tipo,
      fecha: f.created_at,
      cliente: { nombre: f.clientes?.nombre || "", cedula_rnc: f.clientes?.cedula_rnc },
      vendedor: f.usuarios?.nombre || "",
      items: f.factura_items?.map((i) => ({
        nombre: i.productos?.nombre || "",
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        itbis_unitario: i.itbis_unitario,
        subtotal: i.subtotal,
      })) || [],
      subtotal: f.subtotal, itbis_total: f.itbis_total, descuento: f.descuento,
      total: f.total, metodo_pago: f.metodo_pago, estado: f.estado,
    };
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Historial de Facturación</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>REGISTRO INTEGRAL DE TRANSACCIONES FISCALES</p>
        </div>
      </div>

      {/* Filtros Glassmorphism */}
      <div className="glass" style={{ padding: 32, borderRadius: 24, marginBottom: 32, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>
        <div style={{ flex: "2 1 300px" }}>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>BUSCAR NCF O CLIENTE</label>
          <div className="search-bar" style={{ maxWidth: "100%" }}>
            <Search size={22} className="search-icon" color="#6366f1" />
            <input id="buscar-factura" className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej: B0200000001..." 
              style={{ height: 56, fontSize: 15, paddingLeft: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc" }} />
          </div>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>FECHA INICIAL</label>
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} 
            style={{ height: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc", fontWeight: 700 }} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>FECHA FINAL</label>
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} 
            style={{ height: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc", fontWeight: 700 }} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>ESTADO</label>
          <select id="filter-estado" className="select" value={estado} onChange={(e) => setEstado(e.target.value)}
            style={{ height: 56, borderRadius: 14, border: "2px solid #eff6ff", background: "#f8fafc", fontWeight: 700 }}>
            <option value="">Todos los Estados</option>
            <option value="pagada">Pagada</option>
            <option value="pendiente">Pendiente</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={cargar} style={{ height: 56, borderRadius: 16, padding: "0 32px", fontSize: 14 }}>
          FILTRAR RESULTADOS
        </button>
      </div>

      <div className="glass" style={{ borderRadius: 24, overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th style={{ padding: "16px 32px" }}>NÚMERO NCF</th>
                <th style={{ padding: "16px 32px" }}>CLIENTE / MÉTODO</th>
                <th style={{ padding: "16px 32px" }}>FECHA Y HORA</th>
                <th style={{ padding: "16px 32px" }}>MONTO TOTAL</th>
                <th style={{ padding: "16px 32px" }}>ESTADO</th>
                <th style={{ padding: "16px 32px", textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} style={{ padding: "20px 32px" }}><div className="skeleton" style={{ height: 18 }} /></td>)}</tr>
              )) : facturas.map((f) => (
                <tr key={f.id}>
                  <td style={{ padding: "20px 32px" }}>
                    <div style={{ fontWeight: 900, fontFamily: "monospace", color: "#0f172a", fontSize: 15 }}>{f.ncf}</div>
                    <div style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginTop: 4, fontWeight: 800 }}>{f.ncf_tipo}</div>
                  </td>
                  <td style={{ padding: "20px 32px" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>{f.clientes?.nombre.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{f.metodo_pago}</div>
                  </td>
                  <td style={{ padding: "20px 32px", color: "#64748b", fontWeight: 600, fontSize: 12 }}>
                    {format(new Date(f.created_at), "eeee dd 'de' MMMM, HH:mm", { locale: es }).toUpperCase()}
                  </td>
                  <td style={{ padding: "20px 32px", color: "#10b981", fontWeight: 900, fontSize: 16 }}>
                    RD${Number(f.total).toLocaleString()}
                  </td>
                  <td style={{ padding: "20px 32px" }}>
                    <div style={{ 
                      display: "inline-flex", padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 900, textTransform: "uppercase",
                      background: f.estado === "pagada" ? "#f0fdf4" : f.estado === "pendiente" ? "#fffbeb" : "#fef2f2",
                      color: f.estado === "pagada" ? "#10b981" : f.estado === "pendiente" ? "#d97706" : "#ef4444",
                      border: `1px solid ${f.estado === "pagada" ? "#dcfce7" : f.estado === "pendiente" ? "#fef3c7" : "#fee2e2"}`
                    }}>
                      {f.estado}
                    </div>
                  </td>
                  <td style={{ padding: "20px 32px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setFacturaView(f)} style={{ background: "#eff6ff", borderRadius: 10, padding: 10 }}>
                        <ChevronDown size={16} color="#3b82f6" />
                      </button>
                      {isAdmin && f.estado !== "anulada" && (
                        <button className="btn btn-ghost btn-sm" onClick={() => anular(f.id)} style={{ background: "#fef2f2", borderRadius: 10, padding: 10 }}>
                          <XCircle size={16} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver Factura Premium */}
      {facturaView && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ borderRadius: 28, padding: 40, background: "white", maxWidth: 900 }}>
            <div className="modal-header" style={{ marginBottom: 32 }}>
              <div>
                <div style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900, color: "#6366f1", marginBottom: 8, display: "inline-block" }}>VISTA PREVIA DE DOCUMENTO</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Factura {facturaView.ncf}</h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setFacturaView(null)} style={{ background: "#f8fafc" }}><X size={24} /></button>
            </div>
            
            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
              <button className="btn btn-primary" onClick={() => { setModoPrint("a4"); setTimeout(handlePrint, 100); }} 
                style={{ flex: 1, height: 56, borderRadius: 16 }}>
                <Printer size={20} /> IMPRIMIR FORMATO A4
              </button>
              <button className="btn btn-ghost" onClick={() => { setModoPrint("termica"); setTimeout(handlePrint, 100); }} 
                style={{ flex: 1, height: 56, borderRadius: 16, border: "2px solid #eff6ff" }}>
                <Printer size={20} /> TICKET TÉRMICO (80MM)
              </button>
            </div>

            <div className="glass" style={{ background: "#f1f5f9", borderRadius: 24, padding: "40px", overflow: "auto", maxHeight: 500, border: "2px solid #eff6ff" }}>
              <PrintInvoice ref={printRef} data={toInvoiceData(facturaView)} modo={modoPrint} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
