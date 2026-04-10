import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const categoriaId = searchParams.get("categoria");
  const bajoStock = searchParams.get("bajo_stock") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");

  if (bajoStock) {
    // Usar RPC para filtrar stock_actual <= stock_minimo (no se puede hacer con el SDK directamente)
    const { data, error } = await db
      .from("productos")
      .select("*, categorias(nombre)")
      .eq("activo", true)
      .lte("stock_actual", 999999)
      .order("stock_actual")
      .limit(limit);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    // Filtrar en memoria donde stock_actual <= stock_minimo
    const filtered = (data || []).filter(
      (p) => p.stock_actual <= p.stock_minimo,
    );
    return NextResponse.json(filtered);
  }

  let dbQuery = db
    .from("productos")
    .select("*, categorias(nombre)")
    .eq("activo", true)
    .order("nombre")
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`);
  }
  if (categoriaId) {
    dbQuery = dbQuery.eq("categoria_id", categoriaId);
  }

  const { data, error } = await dbQuery;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const body = await request.json();

  const { data, error } = await db
    .from("productos")
    .insert(body)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const db = supabaseAdmin();
    const body = await request.json();
    const { id, categorias, created_at, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID faltante" }, { status: 400 });

    const { data, error } = await db
      .from("productos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const { error } = await db
    .from("productos")
    .update({ activo: false })
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
