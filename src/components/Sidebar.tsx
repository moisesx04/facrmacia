"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText,
  BarChart3, Settings, LogOut, ChevronRight, Pill
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

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: "var(--sidebar-width)",
      background: "rgba(10, 15, 30, 0.95)",
      borderRight: "1px solid var(--border)",
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 15px var(--accent-glow)", flexShrink: 0
          }}>
            <Pill size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>FarmaSystem</div>
            <div style={{ fontSize: 11, color: "var(--accent-light)", fontWeight: 600 }}>PRO</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--radius-sm)",
                    textDecoration: "none",
                    color: active ? "white" : "var(--text-secondary)",
                    background: active ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
                    boxShadow: active ? "0 4px 15px var(--accent-glow)" : "none",
                    fontWeight: active ? 600 : 400,
                    fontSize: 14,
                    transition: "var(--transition)",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
                  onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; } }}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <ChevronRight size={14} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", marginBottom: 8, background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${role === "admin" ? "badge-purple" : "badge-info"}`} style={{ fontSize: 11 }}>
              {role === "admin" ? "👑 Admin" : "🛒 Vendedor"}
            </span>
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-ghost w-full"
          style={{ justifyContent: "center", gap: 8 }}
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
