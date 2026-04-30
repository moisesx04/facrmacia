"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";

interface Cliente { id: string; nombre: string; cedula_rnc?: string; telefono?: string; email?: string; direccion?: string }
const EMPTY: Partial<Cliente> = { nombre: "", cedula_rnc: "", telefono: "", email: "", direccion: "" };

export default function ClientesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [form, setForm] = useState<Partial<Cliente>>(EMPTY);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(busqueda)}`);
    const data = await res.json();
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [busqueda]);

  async function guardar() {
    setGuardando(true);
    const method = form.id ? "PUT" : "POST";
    await fetch("/api/clientes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setModal(null); setForm(EMPTY); await cargar();
    setGuardando(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });
    await cargar();
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>Gestión de Clientes</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: "#64748b" }}>DIRECTORIO INTEGRAL DE PACIENTES Y ENTIDADES</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal("crear"); }}>
          <Plus size={16} /> NUEVO CLIENTE
        </button>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="input" placeholder="BUSCAR POR NOMBRE, CÉDULA O RNC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
            style={{ paddingLeft: 44, padding: "12px 16px 12px 44px" }} />
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="datagrid">
            <thead>
              <tr>
                <th style={{ padding: "16px 32px" }}>NOMBRE COMPLETO</th>
                <th style={{ padding: "16px 32px" }}>IDENTIFICACIÓN</th>
                <th style={{ padding: "16px 32px" }}>CONTACTO</th>
                <th style={{ padding: "16px 32px" }}>EMAIL</th>
                <th style={{ padding: "16px 32px", textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} style={{ padding: "24px 32px" }}><div className="skeleton" style={{ height: 20, borderRadius: 8 }} /></td>)}</tr>
              )) : clientes.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: "24px 32px" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{c.nombre.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>#{c.id.slice(0, 8)}</div>
                  </td>
                  <td style={{ padding: "24px 32px" }}>
                    <span style={{ background: "#eff6ff", color: "#3b82f6", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                      {c.cedula_rnc || "SIN ID"}
                    </span>
                  </td>
                  <td style={{ padding: "24px 32px", color: "#475569", fontWeight: 600 }}>{c.telefono || "—"}</td>
                  <td style={{ padding: "24px 32px", color: "#475569", fontWeight: 600 }}>{c.email || "—"}</td>
                  <td style={{ padding: "24px 32px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost" style={{ padding: "6px" }} onClick={() => { setForm(c); setModal("editar"); }}>
                        <Edit2 size={16} />
                      </button>
                      {isAdmin && (
                        <button className="btn btn-ghost" style={{ padding: "6px", color: "var(--danger)" }} onClick={() => eliminar(c.id)}>
                          <Trash2 size={16} />
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

      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ borderRadius: 28, padding: 40, background: "white" }}>
            <div className="modal-header" style={{ marginBottom: 32 }}>
              <div style={{ background: "#f1f5f9", padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 900, color: "#6366f1", letterSpacing: "0.1em" }}>
                {modal === "crear" ? "REGISTRO" : "EDICIÓN"}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)} style={{ background: "#f8fafc", borderRadius: 12 }}><X size={20} /></button>
            </div>
            
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginBottom: 32 }}>
              {modal === "crear" ? "Nuevo Cliente" : "Actualizar Datos"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {[
                { label: "NOMBRE COMPLETO *", key: "nombre", span: 2 },
                { label: "CÉDULA / RNC", key: "cedula_rnc" },
                { label: "TELÉFONO", key: "telefono" },
                { label: "CORREO ELECTRÓNICO", key: "email" },
                { label: "DIRECCIÓN FISCAL", key: "direccion" },
              ].map(({ label, key, span }) => (
                <div key={key} style={{ gridColumn: span ? `span ${span}` : "auto" }}>
                  <label className="label" style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 10 }}>{label}</label>
                  <input className="input" value={String(form[key as keyof Cliente] || "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} 
                    style={{ background: "#f8fafc", border: "2px solid #eff6ff", borderRadius: 14, height: 52, fontWeight: 600 }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>CANCELAR</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando || !form.nombre} style={{ flex: 2 }}>
                {guardando ? "GUARDANDO..." : "GUARDAR CLIENTE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
