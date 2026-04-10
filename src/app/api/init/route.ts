import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const db = supabaseAdmin();

    // Verificar si ya hay usuarios
    const { count } = await db
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { error: "El sistema ya está inicializado" },
        { status: 409 }
      );
    }

    const adminPassword = "Admin2025!";
    const vendedorPassword = "Vendedor2025!";

    const adminHash = await bcrypt.hash(adminPassword, 12);
    const vendedorHash = await bcrypt.hash(vendedorPassword, 12);

    await db.from("usuarios").insert([
      {
        nombre: "Administrador",
        email: "admin@farmasystem.com",
        password_hash: adminHash,
        rol: "admin",
      },
      {
        nombre: "Vendedor",
        email: "ventas@farmasystem.com",
        password_hash: vendedorHash,
        rol: "vendedor",
      },
    ]);

    return NextResponse.json({
      message: "✅ Sistema inicializado correctamente",
      credenciales: [
        { email: "admin@farmasystem.com", password: adminPassword, rol: "admin" },
        { email: "ventas@farmasystem.com", password: vendedorPassword, rol: "vendedor" },
      ],
      aviso: "⚠️ Cambia estas contraseñas inmediatamente después del primer login.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al inicializar" }, { status: 500 });
  }
}
