# FarmaSystem Pro 💊

Sistema de Facturación y Punto de Venta (POS) profesional para farmacias, construido con **Next.js 14**, **React**, **TypeScript**, **Supabase (PostgreSQL)** y **NextAuth**.

---

## 🚀 Stack Tecnológico

- **Frontend + Backend**: Next.js 14 App Router (TypeScript)
- **Base de Datos**: PostgreSQL via [Supabase](https://supabase.com)
- **Autenticación**: NextAuth v5 con roles (Admin / Vendedor)
- **Estilos**: CSS puro (glassmorphism, dark mode premium)
- **Deploy**: [Vercel](https://vercel.com)

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 🛒 Punto de Venta | POS ultraveloz con búsqueda pg_trgm |
| 🧾 Facturas NCF | B01 (Crédito Fiscal), B02 (Consumidor Final), B14 |
| 📦 Inventario | CRUD + importación masiva CSV + alertas de stock |
| 👥 Clientes | Gestión con RNC/Cédula para crédito fiscal |
| 📊 Reportes | Ventas por período + exportación CSV (solo Admin) |
| 🔒 RBAC | Roles Admin/Vendedor con restrinciones por ruta y UI |
| 🖨️ Impresión | Dual: A4 y Térmica 80mm con NCF completo |
| ⚡ Atómico | Venta = 1 llamada RPC (factura + stock + auditoría) |

---

## 📋 Configuración Inicial

### 1. Clonar y instalar

```bash
git clone https://github.com/TU_USUARIO/farmasystem.git
cd farmasystem
npm install
```

### 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
NEXTAUTH_SECRET=un-string-aleatorio-muy-largo
NEXTAUTH_URL=http://localhost:3000
```

### 3. Base de datos

En Supabase → SQL Editor, ejecuta el contenido de `supabase/schema.sql`.

### 4. Inicializar usuarios

```bash
# Después de levantar el servidor
curl -X POST http://localhost:3000/api/init
```

Esto crea:
- **Admin**: `admin@farmasystem.com` / `Admin2025!`
- **Vendedor**: `ventas@farmasystem.com` / `Vendedor2025!`

⚠️ **Cambia estas contraseñas inmediatamente.**

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

---

## 🚀 Deploy en Vercel

1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Configura las variables de entorno (mismo `.env.local` pero con `NEXTAUTH_URL=https://TU-DOMINIO.vercel.app`)
4. Deploy automático en cada push a `main`

---

## 🔐 Seguridad

- **RLS**: Row Level Security activo en todas las tablas
- **Service Role**: Solo el backend accede con privilegios elevados
- **RBAC**: Middleware protege rutas por rol
- **Transacciones atómicas**: RPC garantiza consistencia en ventas

---

## 📁 Estructura

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── ventas/       ← POS
│   │   ├── inventario/
│   │   ├── clientes/
│   │   ├── facturas/
│   │   ├── reportes/     ← Admin only
│   │   └── configuracion/ ← Admin only
│   └── api/
├── components/
│   ├── Sidebar.tsx
│   ├── PrintInvoice.tsx
│   └── SessionProvider.tsx
└── lib/
    ├── auth.ts
    ├── supabase.ts
    └── ncf.ts
```
