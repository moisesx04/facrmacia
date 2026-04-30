import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden anular facturas" }, { status: 403 });
    }

    const db = supabaseAdmin();
    const { id } = await params;

    // 1. Obtener factura
    const { data: factura, error: errFetch } = await db.from("facturas").select("estado").eq("id", id).single();
    if (errFetch || !factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    if (factura.estado === "anulada") return NextResponse.json({ error: "La factura ya ha sido anulada previamente" }, { status: 400 });

    // 2. Obtener productos de la factura para reponer inventario
    const { data: items, error: errItems } = await db.from("factura_items").select("producto_id, cantidad").eq("factura_id", id);
    if (errItems) return NextResponse.json({ error: "Error interno al procesar los artículos" }, { status: 500 });

    if (items && items.length > 0) {
      for (const item of items) {
        const { data: prod } = await db.from("productos").select("stock_actual").eq("id", item.producto_id).single();
        if (prod) {
          await db.from("productos").update({ stock_actual: prod.stock_actual + item.cantidad }).eq("id", item.producto_id);
        }
      }
    }

    // 3. Anular estado
    const { error: updateErr } = await db.from("facturas").update({ estado: "anulada", notas: "Anulada por administrador" }).eq("id", id);
    
    if (updateErr) return NextResponse.json({ error: "No se pudo cambiar el estado de la factura" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
