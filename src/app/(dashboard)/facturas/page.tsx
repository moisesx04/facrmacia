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
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Facturas</h1>
          <p className="page-subtitle">{facturas.length} facturas encontradas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass" style={{ padding: 20, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label className="label">Buscar NCF / Cliente</label>
          <div className="search-bar" style={{ maxWidth: "100%" }}>
            <Search size={16} className="search-icon" />
            <input id="buscar-factura" className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="NCF o cliente..." />
          </div>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label className="label">Desde</label>
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label className="label">Hasta</label>
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label className="label">Estado</label>
          <select id="filter-estado" className="select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pagada">Pagada</option>
            <option value="pendiente">Pendiente</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={cargar}>Buscar</button>
      </div>

      <div className="glass">
        <div className="table-container">
          <table>
            <thead><tr>
              <th>NCF</th><th>Tipo</th><th>Cliente</th><th>Vendedor</th>
              <th>Fecha</th><th>Total</th><th>Método</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>)}</tr>
              )) : facturas.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{f.ncf}</td>
                  <td><span className="badge badge-purple">{f.ncf_tipo}</span></td>
                  <td>{f.clientes?.nombre}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{f.usuarios?.nombre}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {format(new Date(f.created_at), "dd/MM/yy HH:mm", { locale: es })}
                  </td>
                  <td style={{ color: "var(--success)", fontWeight: 700 }}>RD${Number(f.total).toFixed(2)}</td>
                  <td style={{ textTransform: "capitalize" }}>{f.metodo_pago}</td>
                  <td><span className={`badge ${ESTADO_BADGE[f.estado] || "badge-info"}`}>{f.estado}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button id={`view-${f.id}`} className="btn btn-ghost btn-sm" onClick={() => setFacturaView(f)}><ChevronDown size={14} /> Ver</button>
                      {isAdmin && f.estado !== "anulada" && (
                        <button id={`anular-${f.id}`} className="btn btn-ghost btn-sm" onClick={() => anular(f.id)} style={{ color: "var(--danger)" }}>
                          <XCircle size={14} /> Anular
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

      {/* Modal Ver Factura */}
      {facturaView && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Factura — {facturaView.ncf}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setFacturaView(null)}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button id="btn-print-a4-hist" className="btn btn-primary btn-sm" onClick={() => { setModoPrint("a4"); setTimeout(handlePrint, 100); }}>
                <Printer size={14} /> Imprimir A4
              </button>
              <button id="btn-print-ter-hist" className="btn btn-ghost btn-sm" onClick={() => { setModoPrint("termica"); setTimeout(handlePrint, 100); }}>
                <Printer size={14} /> Térmica
              </button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "auto", maxHeight: 500 }}>
              <PrintInvoice ref={printRef} data={toInvoiceData(facturaView)} modo={modoPrint} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
