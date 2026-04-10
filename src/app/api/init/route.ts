import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() { return await POST(); }

export async function POST() {
  try {
    const db = supabaseAdmin();

    const adminUser = "admin";
    const adminPassword = "admin1234@";
    const vendedorUser = "ventas";
    const vendedorPassword = "vendedor1234@";

    const adminHash = await bcrypt.hash(adminPassword, 12);
    const vendedorHash = await bcrypt.hash(vendedorPassword, 12);

    // Upsert admin
    await db.from("usuarios").upsert({
      nombre: "Administrador",
      email: adminUser,
      password_hash: adminHash,
      rol: "admin",
      activo: true
    }, { onConflict: 'email' });

    // Upsert vendedor
    await db.from("usuarios").upsert({
      nombre: "Vendedor",
      email: vendedorUser,
      password_hash: vendedorHash,
      rol: "vendedor",
      activo: true
    }, { onConflict: 'email' });

    return NextResponse.json({
      message: "✅ Credenciales actualizadas correctamente",
      credenciales: [
        { usuario: adminUser, password: adminPassword, rol: "admin" },
        { usuario: vendedorUser, password: vendedorPassword, rol: "vendedor" },
      ],
      aviso: "⚠️ Prueba iniciar sesión ahora con estos datos.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar credenciales" }, { status: 500 });
  }
}
