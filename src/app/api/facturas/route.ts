import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const limit = parseInt(searchParams.get("limit") || "100");

  let query = db
    .from("facturas")
    .select(`*, clientes(nombre, cedula_rnc), usuarios(nombre), factura_items(*, productos(nombre, codigo))`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (desde) query = query.gte("created_at", desde);
  if (hasta) query = query.lte("created_at", hasta + "T23:59:59");
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const body = await request.json();

  const { data, error } = await db.rpc("create_invoice_process", {
    p_ncf_tipo: body.ncf_tipo,
    p_cliente_id: body.cliente_id,
    p_usuario_id: body.usuario_id,
    p_subtotal: body.subtotal,
    p_itbis_total: body.itbis_total,
    p_descuento: body.descuento || 0,
    p_total: body.total,
    p_metodo_pago: body.metodo_pago,
    p_estado: body.estado || "pagada",
    p_notas: body.notas || "",
    p_items: body.items,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
