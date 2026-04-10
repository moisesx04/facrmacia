import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const contentType = request.headers.get("content-type") || "";

  let productos: Record<string, unknown>[] = [];

  if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const text = await file.text();

    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    productos = (result.data as Record<string, unknown>[]).map((row) => ({
      codigo: row.codigo || row.Codigo,
      nombre: row.nombre || row.Nombre,
      precio: parseFloat(String(row.precio || row.Precio || 0)),
      costo: parseFloat(String(row.costo || row.Costo || 0)),
      stock_actual: parseInt(String(row.stock || row.Stock || row.stock_actual || 0)),
      stock_minimo: parseInt(String(row.stock_minimo || row.StockMinimo || 5)),
      aplica_itbis: row.itbis !== false && row.aplica_itbis !== false,
    }));
  } else {
    const body = await request.json();
    productos = Array.isArray(body) ? body : [body];
  }

  // Batch insert en chunks de 100
  const CHUNK = 100;
  let insertados = 0;
  const errores: string[] = [];

  for (let i = 0; i < productos.length; i += CHUNK) {
    const chunk = productos.slice(i, i + CHUNK);
    const { data: inserted, error } = await db
      .from("productos")
      .upsert(chunk, { onConflict: "codigo" })
      .select("id");

    if (error) errores.push(error.message);
    else insertados += inserted?.length || chunk.length;
  }

  return NextResponse.json({ insertados, errores });
}
