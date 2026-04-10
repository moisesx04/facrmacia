"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText,
  BarChart3, Settings, LogOut, ChevronRight, Pill, Menu, X
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

  // Cerrar sidebar al cambiar de ruta (solo en móvil)
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
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`} style={{
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 0,
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px var(--accent)", flexShrink: 0
            }}>
              <Pill size={20} color="black" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>FARMASYSTEM</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "1px" }}>PRO CORE</div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex" }}
            className="md-hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
            {filtered.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 0,
                      textDecoration: "none",
                      color: active ? "var(--bg-primary)" : "var(--text-secondary)",
                      background: active ? "var(--accent)" : "transparent",
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      transition: "var(--transition)",
                      position: "relative",
                      border: active ? "none" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; } }}
                    onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; } }}
                  >
                    <Icon size={18} />
                    <span style={{ flex: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</span>
                    {active && <ChevronRight size={14} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User + Logout */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
          <div style={{ padding: "14px", border: "1px solid var(--border)", marginBottom: 8, background: "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 0,
                background: "var(--accent)",
                color: "var(--bg-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>
                {userName?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase" }}>{userName}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "2px 6px", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {role === "admin" ? "ADMINISTRADOR" : "VENDEDOR"}
              </span>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-ghost w-full"
            style={{ justifyContent: "center", gap: 8, borderRadius: 0, border: "1px solid var(--border)", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
