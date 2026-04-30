import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  let query = db.from("clientes").select("*").order("nombre");
  if (q) query = query.or(`nombre.ilike.%${q}%,cedula_rnc.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const body = await request.json();
  const { data, error } = await db.from("clientes").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const body = await request.json();
  const { id, ...updates } = body;
  const { data, error } = await db.from("clientes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const { error } = await db.from("clientes").delete().eq("id", id!);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
