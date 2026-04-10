import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmaSystem Pro — Sistema de Facturación",
  description: "Sistema POS y facturación fiscal profesional para farmacias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
