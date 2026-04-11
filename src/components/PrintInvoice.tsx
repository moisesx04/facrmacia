"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface InvoiceData {
  ncf: string;
  ncf_tipo: string;
  fecha: string;
  cliente: { nombre: string; cedula_rnc?: string };
  vendedor: string;
  items: { nombre: string; cantidad: number; precio_unitario: number; itbis_unitario: number; subtotal: number }[];
  subtotal: number;
  itbis_total: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  estado: string;
}

interface PrintInvoiceProps {
  data: InvoiceData;
  modo: "a4" | "termica";
}

const NCF_NOMBRES: Record<string, string> = {
  B01: "Crédito Fiscal",
  B02: "Consumidor Final",
  B14: "Gubernamental",
};

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Crédito",
};

export const PrintInvoice = React.forwardRef<HTMLDivElement, PrintInvoiceProps>(({ data, modo }, ref) => {
  const isTermica = modo === "termica";
  const fecha = format(new Date(data.fecha), "dd/MM/yyyy HH:mm", { locale: es });

  const s: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: isTermica ? 11 : 13,
    color: "#000",
    background: "#fff",
    padding: isTermica ? "8px" : "32px",
    width: isTermica ? "72mm" : "210mm",
    margin: "0 auto",
    lineHeight: 1.5,
  };

  const hr = (style?: React.CSSProperties) => (
    <div style={{ borderTop: "1px dashed #000", margin: "6px 0", ...style }} />
  );

  const row = (left: string, right: string, bold?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}>
      <span>{left}</span><span>{right}</span>
    </div>
  );

  if (isTermica) {
    return (
      <div ref={ref} style={s}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>FARMACIA ARCHI DOMINICANA</div>
        <div style={{ textAlign: "center", fontSize: 10 }}>Software de Gestión v8</div>
        {hr()}
        <div style={{ textAlign: "center", fontSize: 10 }}>
          <div>{NCF_NOMBRES[data.ncf_tipo] || data.ncf_tipo}</div>
          <div style={{ fontWeight: 700 }}>{data.ncf}</div>
        </div>
        {hr()}
        <div style={{ fontSize: 10 }}>
          <div>Fecha: {fecha}</div>
          <div>Cliente: {data.cliente.nombre}</div>
          {data.cliente.cedula_rnc && <div>RNC/Céd: {data.cliente.cedula_rnc}</div>}
          <div>Vendedor: {data.vendedor}</div>
        </div>
        {hr()}
        {data.items.map((item, i) => (
          <div key={i} style={{ fontSize: 10, marginBottom: 4 }}>
            <div>{item.nombre}</div>
            {row(`  ${item.cantidad} x $${item.precio_unitario.toFixed(2)}`, `$${item.subtotal.toFixed(2)}`)}
          </div>
        ))}
        {hr()}
        <div style={{ fontSize: 10 }}>
          {row("Subtotal:", `$${data.subtotal.toFixed(2)}`)}
          {data.descuento > 0 && row("Descuento:", `-$${data.descuento.toFixed(2)}`)}
        </div>
        {hr()}
        {row("TOTAL:", `RD$${data.total.toFixed(2)}`, true)}
        <div style={{ fontSize: 10 }}>Pago: {METODO_LABELS[data.metodo_pago]}</div>
        {data.estado === "pendiente" && (
          <div style={{ textAlign: "center", fontWeight: 700, marginTop: 8 }}>** PENDIENTE DE PAGO **</div>
        )}
        {hr()}
        <div style={{ textAlign: "center", fontSize: 10 }}>¡Gracias por su compra!</div>
      </div>
    );
  }

  // A4
  return (
    <div ref={ref} style={{ ...s, fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "sans-serif" }}>💊 ARCHI DOMINICANA</div>
          <div style={{ fontSize: 11, color: "#555" }}>Software de Gestión Farmacéutica</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#555" }}>Comprobante Fiscal</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{data.ncf}</div>
          <div style={{ fontSize: 11 }}>{NCF_NOMBRES[data.ncf_tipo] || data.ncf_tipo}</div>
        </div>
      </div>

      <div style={{ borderTop: "3px solid #000", borderBottom: "1px solid #ccc", padding: "12px 0", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>DATOS DEL CLIENTE</div>
            <div>{data.cliente.nombre}</div>
            {data.cliente.cedula_rnc && <div>RNC/Céd: {data.cliente.cedula_rnc}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div><b>Fecha:</b> {fecha}</div>
            <div><b>Vendedor:</b> {data.vendedor}</div>
            <div><b>Método:</b> {METODO_LABELS[data.metodo_pago]}</div>
            {data.estado === "pendiente" && <div style={{ color: "red", fontWeight: 700 }}>PENDIENTE DE PAGO</div>}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {["#", "Descripción", "Cant.", "Precio", "Total"].map((h) => (
              <th key={h} style={{ padding: "8px 10px", textAlign: h === "#" || h === "Cant." ? "center" : "left", borderBottom: "2px solid #ccc" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 10px", textAlign: "center" }}>{i + 1}</td>
              <td style={{ padding: "8px 10px" }}>{item.nombre}</td>
              <td style={{ padding: "8px 10px", textAlign: "center" }}>{item.cantidad}</td>
              <td style={{ padding: "8px 10px" }}>RD${item.precio_unitario.toFixed(2)}</td>
              <td style={{ padding: "8px 10px", fontWeight: 600 }}>RD${item.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 280, fontSize: 13 }}>
          {row("Subtotal:", `RD$${data.subtotal.toFixed(2)}`)}
          {data.descuento > 0 && row("Descuento:", `-RD$${data.descuento.toFixed(2)}`)}
          <div style={{ borderTop: "2px solid #000", marginTop: 8, paddingTop: 8 }}>
            {row("TOTAL:", `RD$${data.total.toFixed(2)}`, true)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, borderTop: "1px dashed #ccc", paddingTop: 12, fontSize: 11, color: "#666", textAlign: "center" }}>
        Este comprobante es válido como constancia de compra. Generado por FARMACIA ARCHI DOMINICANA.
      </div>
    </div>
  );
});

PrintInvoice.displayName = "PrintInvoice";
