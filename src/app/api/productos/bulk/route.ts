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
      codigo: String(row.codigo || row.Codigo || row.codigo_opcional || ""),
      nombre: String(row.nombre || row.Nombre || ""),
      precio: parseFloat(String(row.precio || row.Precio || row.precio_opcional || 0)),
      costo: parseFloat(String(row.costo || row.Costo || row.costo_opcional || 0)),
      stock_actual: parseInt(String(row.stock || row.Stock || row.stock_actual || row.stock_actual_opcional || 0)),
      stock_minimo: parseInt(String(row.stock_minimo || row.StockMinimo || row.stock_minimo_opcional || 5)),
      aplica_itbis: row.itbis !== false && row.aplica_itbis !== false,
      activo: true
    })).filter(p => p.codigo && p.nombre);
  } else {
    const body = await request.json();
    productos = Array.isArray(body) ? body : [body];
  }

  // 1. Obtener todos los códigos para verificar existencia
  const codigos = productos.map(p => String(p.codigo));
  const { data: existentes } = await db
    .from("productos")
    .select("codigo, precio, costo, stock_actual, stock_minimo")
    .in("codigo", codigos);

  const existingMap = new Map(existentes?.map(e => [e.codigo, e]));

  // 2. Mezcla inteligente (Smart Merge)
  const finalProductos = productos.map(p => {
    const dbProd = existingMap.get(String(p.codigo));
    if (!dbProd) return p; // Es nuevo, usar tal cual

    return {
      ...p,
      // Solo sobrescribir si el CSV trae un valor > 0, de lo contrario mantener el de la DB
      precio: (Number(p.precio) > 0) ? p.precio : dbProd.precio,
      costo: (Number(p.costo) > 0) ? p.costo : dbProd.costo,
      stock_actual: (Number(p.stock_actual) > 0) ? p.stock_actual : dbProd.stock_actual,
      stock_minimo: (Number(p.stock_minimo) > 5) ? p.stock_minimo : dbProd.stock_minimo,
      updated_at: new Date().toISOString()
    };
  });

  // Batch insert/upsert en chunks de 100
  const CHUNK = 100;
  let insertados = 0;
  const errores: string[] = [];

  for (let i = 0; i < finalProductos.length; i += CHUNK) {
    const chunk = finalProductos.slice(i, i + CHUNK);
    const { data: inserted, error } = await db
      .from("productos")
      .upsert(chunk, { onConflict: "codigo" })
      .select("id");

    if (error) {
      console.error("Bulk Error:", error);
      errores.push(error.message);
    } else {
      insertados += inserted?.length || chunk.length;
    }
  }

  return NextResponse.json({ insertados, errores });
}
