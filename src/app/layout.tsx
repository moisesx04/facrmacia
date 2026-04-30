import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FARMACIA ARCHI DOMINICANA — Sistema de Facturación",
  description: "Sistema POS y facturación fiscal profesional para farmacias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
