import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from("usuarios").select("id, nombre, email, rol, activo, created_at").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { nombre, email, password, rol, currentAdminPassword } = body;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // If creating an admin, verify current admin's password
    if (rol === "admin") {
      if (!currentAdminPassword) {
        return NextResponse.json({ error: "Se requiere la contraseña del administrador actual" }, { status: 400 });
      }

      // Fetch current admin's hash
      const { data: adminUser, error: adminErr } = await db
        .from("usuarios")
        .select("password_hash")
        .eq("email", session.user.email)
        .single();
      
      if (adminErr || !adminUser) {
        return NextResponse.json({ error: "Error al verificar credenciales de administrador" }, { status: 500 });
      }

      const validAdmin = await bcrypt.compare(currentAdminPassword, adminUser.password_hash);
      if (!validAdmin) {
        return NextResponse.json({ error: "Contraseña de administrador incorrecta" }, { status: 403 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error: insertErr } = await db.from("usuarios").insert({
      nombre,
      email,
      password_hash: passwordHash,
      rol,
      activo: true
    }).select("id, nombre, email, rol, activo, created_at").single();

    if (insertErr) {
      if (insertErr.code === '23505') { // Unique violation
        return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(newUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, nombre, email, password, rol, currentAdminPassword } = body;

    if (!id || !nombre || !email || !rol) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const db = supabaseAdmin();

    if (rol === "admin") {
      if (!currentAdminPassword) {
        return NextResponse.json({ error: "Se requiere la contraseña del administrador actual para asignar este rol" }, { status: 400 });
      }

      const { data: adminUser, error: adminErr } = await db
        .from("usuarios")
        .select("password_hash")
        .eq("email", session.user.email)
        .single();
      
      if (adminErr || !adminUser) {
        return NextResponse.json({ error: "Error al verificar credenciales" }, { status: 500 });
      }

      const validAdmin = await bcrypt.compare(currentAdminPassword, adminUser.password_hash);
      if (!validAdmin) {
        return NextResponse.json({ error: "Contraseña de administrador incorrecta" }, { status: 403 });
      }
    }

    const updates: any = { nombre, email, rol };
    if (password && password.trim() !== "") {
      updates.password_hash = await bcrypt.hash(password, 12);
    }

    const { data: updatedUser, error: updateErr } = await db.from("usuarios").update(updates).eq("id", id).select("id, nombre, email, rol, activo, created_at").single();

    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
      }
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
