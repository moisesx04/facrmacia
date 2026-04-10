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
    const fileName = file.name.toLowerCase();

    // 1. Detectar si es una lista simple de nombres (TXT o CSV sin cabezales)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const isNameList = fileName.endsWith(".txt") && !text.includes(",") && !text.includes(";");

    if (isNameList) {
      // Formato TXT solicitado: solo nombres
      productos = lines.map(line => ({ nombre: line, codigo: "", itbis: 0.18, aplica_itbis: true }));
    } else {
      // Formato CSV estándar
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
      productos = (result.data as Record<string, unknown>[]).map((row) => ({
        codigo: String(row.codigo || row.Codigo || row.codigo_opcional || ""),
        nombre: String(row.nombre || row.Nombre || ""),
        precio: parseFloat(String(row.precio || row.Precio || 0)),
        costo: parseFloat(String(row.costo || row.Costo || 0)),
        stock_actual: parseInt(String(row.stock || row.Stock || row.stock_actual || 0)),
        stock_minimo: 5,
        aplica_itbis: true,
        activo: true
      })).filter(p => (p.codigo || p.nombre));
    }
  } else {
    const body = await request.json();
    productos = Array.isArray(body) ? body : [body];
  }

  // 1. Obtener productos existentes (por código y nombre) para el Smart Merge
  const { data: existentes } = await db.from("productos").select("id, codigo, nombre, precio, costo, stock_actual");
  const existingByCode = new Map(existentes?.map(e => [e.codigo.toLowerCase(), e]));
  const existingByName = new Map(existentes?.map(e => [e.nombre.toLowerCase(), e]));

  // 2. Mezcla inteligente (Smart Merge) y Generación de Códigos
  const processed = productos.map(p => {
    const nombre = String(p.nombre).trim();
    const codigo = String(p.codigo).trim();
    
    // Buscar coincidencia (prioridad código, luego nombre)
    let dbProd = null;
    if (codigo) dbProd = existingByCode.get(codigo.toLowerCase());
    if (!dbProd && nombre) dbProd = existingByName.get(nombre.toLowerCase());

    if (!dbProd) {
      // Es un producto nuevo
      return {
        ...p,
        codigo: codigo || `AUT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        nombre,
        activo: true
      };
    }

    // Es un producto existente -> Smart Merge
    return {
      ...dbProd, // Mantener ID y otros datos
      ...p,
      codigo: dbProd.codigo, // Preservar código original si se encontró por nombre
      nombre: dbProd.nombre,
      // Solo actualizar si el archivo trae valores positivos
      precio: (Number(p.precio) > 0) ? p.precio : dbProd.precio,
      costo: (Number(p.costo) > 0) ? p.costo : dbProd.costo,
      stock_actual: (Number(p.stock_actual) > 0) ? p.stock_actual : dbProd.stock_actual,
      updated_at: new Date().toISOString()
    };
  });

  // Batch upsert
  const { data: done, error } = await db.from("productos").upsert(processed, { onConflict: "codigo" }).select("id");

  if (error) {
    console.error("Bulk Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ insertados: done?.length || 0 });
}
