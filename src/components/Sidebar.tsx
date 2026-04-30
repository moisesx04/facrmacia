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
        width: 280, /* Increased width slightly */
        height: '100vh',
        background: "#ffffff",
        borderRight: "2px solid var(--border)", /* Thicker border */
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header / Logo */}
        <div style={{ padding: "40px 24px", display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid var(--border)" }}>
          <div style={{ 
            width: 44, height: 44, background: "var(--primary)", 
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Pill size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ color: "black", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>FARMACIA ARCHI DOMINICANA</h1>
            <p style={{ color: "var(--primary)", fontSize: 11, fontWeight: 700, margin: "2px 0 0 0" }}>GESTIÓN PROFESIONAL</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "32px 16px", display: "flex", flexDirection: "column", gap: 8, overflowY: 'auto' }}>
          {filtered.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                textDecoration: "none", borderRadius: 10, transition: "all 0.2s ease",
                background: active ? "#eff6ff" : "transparent",
                border: active ? "2px solid var(--primary)" : "2px solid transparent",
                color: active ? "var(--primary)" : "#334155"
              }}>
                 <Icon size={22} style={{ color: active ? "var(--primary)" : "#64748b" }} />
                <span style={{ 
                  fontSize: 16, fontWeight: active ? 800 : 600, 
                }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Footer */}
        <div style={{ padding: "24px 16px", borderTop: "2px solid var(--border)" }}>
          <div style={{ 
            display: "flex", alignItems: "center", gap: 14, padding: "16px", 
            background: "#f8fafc", borderRadius: 12, marginBottom: 16, border: "2px solid #e2e8f0"
          }}>
            <div style={{ 
              width: 40, height: 40, background: "var(--primary)", 
              color: "white", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 18, fontWeight: 800
            }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "black", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{role === "admin" ? "ADMINISTRADOR" : "VENDEDOR"}</div>
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
