"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText,
  BarChart3, Settings, LogOut, Pill, Menu, X, ShoppingBag
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
        style={{ position: 'fixed', top: 20, left: 20, zIndex: 100, background: '#0f172a', color: 'white', border: 'none', padding: 10, borderRadius: 12 }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`} style={{ 
        width: 280, 
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: 'flex',
        flexDirection: 'column',
        zIndex: 90,
        transition: 'transform 0.3s ease'
      }}>
        {/* Header / Logo */}
        <div style={{ padding: "40px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ 
            width: 48, height: 48, background: "linear-gradient(135deg, #6366f1, #a855f7)", 
            borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 16px rgba(99, 102, 241, 0.4)"
          }}>
            <Pill size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ color: "#ffffff", fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>FarmaSystem</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>PREMIUM CORE v3.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "32px 14px", display: "flex", flexDirection: "column", gap: 6, overflowY: 'auto' }}>
          {filtered.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const colors: Record<string, string> = {
              "/dashboard": "#6366f1",
              "/ventas": "#10b981",
              "/inventario": "#f59e0b",
              "/clientes": "#ec4899",
              "/facturas": "#3b82f6",
              "/reportes": "#a855f7",
              "/configuracion": "#64748b"
            };
            const itemColor = colors[item.href] || "#6366f1";

            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                textDecoration: "none", borderRadius: 16, transition: "all 0.3s ease",
                background: active ? "rgba(255, 255, 255, 0.1)" : "transparent",
                border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 10, 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? itemColor : "rgba(255,255,255,0.05)",
                  transition: "all 0.3s ease"
                }}>
                  <Icon size={18} color={active ? "#ffffff" : "rgba(255,255,255,0.4)"} />
                </div>
                <span style={{ 
                  fontSize: 13, fontWeight: active ? 700 : 500, 
                  color: active ? "#ffffff" : "rgba(255,255,255,0.6)",
                  letterSpacing: "0.02em" 
                }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Footer */}
        <div style={{ padding: "24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ 
            display: "flex", alignItems: "center", gap: 14, padding: "16px", 
            background: "rgba(255,255,255,0.05)", borderRadius: 20, marginBottom: 16 
          }}>
            <div style={{ 
              width: 40, height: 40, background: "linear-gradient(135deg, #3b82f6, #6366f1)", 
              color: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
            }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{role}</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ 
            width: "100%", justifyContent: "center", background: "rgba(239, 68, 68, 0.1)", 
            border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", borderRadius: 14, height: 48,
            fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <LogOut size={16} /> CERRAR SESIÓN
          </button>
        </div>
      </aside>
    </>
  );
}
