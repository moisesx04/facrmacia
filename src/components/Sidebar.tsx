"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText,
  BarChart3, Settings, LogOut, Pill, Menu, X
} from "lucide-react";

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "vendedor"] },
  { href: "/ventas", icon: ShoppingCart, label: "Punto de Venta", roles: ["admin", "vendedor"] },
  { href: "/inventario", icon: Package, label: "Inventario", roles: ["admin", "vendedor"] },
  { href: "/clientes", icon: Users, label: "Clientes", roles: ["admin", "vendedor"] },
  { href: "/facturas", icon: FileText, label: "Facturas", roles: ["admin", "vendedor"] },
  { href: "/reportes", icon: BarChart3, label: "Reportes", roles: ["admin"] },
  { href: "/configuracion", icon: Settings, label: "Configuración", roles: ["admin"] },
];

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Botón de Menú Móvil */}
      <button 
        className="mobile-nav-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 100, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8 }}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`} style={{ 
        width: 260, 
        height: '100vh',
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header / Logo */}
        <div style={{ padding: "32px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ 
            width: 36, height: 36, background: "#0f172a", 
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Pill size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ color: "#0f172a", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>FARMACIA ARCHI DOMINICANA</h1>
            <p style={{ color: "#64748b", fontSize: 10, fontWeight: 500, margin: 0 }}>SOFTWARE DE GESTIÓN</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4, overflowY: 'auto' }}>
          {filtered.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                textDecoration: "none", borderRadius: 8, transition: "all 0.2s ease",
                background: active ? "#f1f5f9" : "transparent",
                color: active ? "#0f172a" : "#64748b"
              }}>
                 <Icon size={18} style={{ color: active ? "#000000" : "#94a3b8" }} />
                <span style={{ 
                  fontSize: 14, fontWeight: active ? 600 : 500, 
                }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Footer */}
        <div style={{ padding: "20px 16px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ 
            display: "flex", alignItems: "center", gap: 12, padding: "12px", 
            background: "#f8fafc", borderRadius: 8, marginBottom: 12, border: "1px solid #f1f5f9"
          }}>
            <div style={{ 
              width: 32, height: 32, background: "#e2e8f0", 
              color: "#334155", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 14, fontWeight: 600
            }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}>{role === "admin" ? "Administrador" : "Operador"}</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ 
            width: "100%", justifyContent: "center", background: "white", 
            border: "1px solid #e2e8f0", color: "#ef4444", borderRadius: 8, height: 40,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: "all 0.2s"
          }} 
          onMouseOver={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; }}
          onMouseOut={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
