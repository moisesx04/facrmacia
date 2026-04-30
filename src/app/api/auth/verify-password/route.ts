import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: user, error } = await db
      .from("usuarios")
      .select("password_hash")
      .eq("email", session.user.email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
