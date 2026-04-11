import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden registrar pagos" }, { status: 403 });
    }

    const db = supabaseAdmin();
    const { id } = await params;
    const body = await request.json();
    const { metodo_pago } = body;

    const { data: factura, error: errFetch } = await db.from("facturas").select("estado").eq("id", id).single();
    if (errFetch || !factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    if (factura.estado !== "pendiente") return NextResponse.json({ error: "La factura no está pendiente de pago" }, { status: 400 });

    const { data: updated, error: errUpdate } = await db
      .from("facturas")
      .update({ estado: "pagada", metodo_pago: metodo_pago || "efectivo" })
      .eq("id", id)
      .select()
      .single();

    if (errUpdate) return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
