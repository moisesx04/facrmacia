import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden anular facturas" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { id } = await params;

  const { data, error } = await db.rpc("anular_factura", {
    p_factura_id: id,
    p_usuario_id: session.user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
