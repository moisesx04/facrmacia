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
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        <button id="btn-nuevo-cliente" className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal("crear"); }}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="search-bar" style={{ maxWidth: "100%" }}>
          <Search size={16} className="search-icon" />
          <input id="buscar-cliente" className="input" placeholder="Buscar por nombre o RNC/Cédula..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div className="glass">
        <div className="table-container">
          <table>
            <thead><tr><th>Nombre</th><th>RNC / Cédula</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>)}</tr>
              )) : clientes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td><span className="badge badge-info">{c.cedula_rnc || "—"}</span></td>
                  <td style={{ color: "var(--text-secondary)" }}>{c.telefono || "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{c.email || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button id={`edit-cliente-${c.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm(c); setModal("editar"); }}><Edit2 size={14} /></button>
                      {isAdmin && <button id={`del-cliente-${c.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => eliminar(c.id)}><Trash2 size={14} color="var(--danger)" /></button>}
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
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === "crear" ? "Nuevo Cliente" : "Editar Cliente"}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Nombre *", key: "nombre" }, { label: "RNC / Cédula", key: "cedula_rnc" },
                { label: "Teléfono", key: "telefono" }, { label: "Email", key: "email" }, { label: "Dirección", key: "direccion" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input className="input" value={String(form[key as keyof Cliente] || "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button id="btn-guardar-cliente" className="btn btn-primary" onClick={guardar} disabled={guardando || !form.nombre}>{guardando ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
