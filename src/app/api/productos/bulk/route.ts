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
  let rawText = "";
  let productos: any[] = [];

  try {
    const contentType = request.headers.get("content-type") || "";
    
    // 1. Extraer el texto del cuerpo (ya sea FormData o JSON)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
      rawText = await file.text();
    } else {
      const body = await request.json();
      if (Array.isArray(body)) {
        productos = body;
      } else {
        rawText = String(body.text || "");
      }
    }

    if (!rawText && productos.length === 0) {
      return NextResponse.json({ error: "No hay datos para procesar" }, { status: 400 });
    }

    // 2. Parser Híbrido: Intentar CSV primero, si no hay cabeceras útiles, tratar como Lista de Nombres
    if (rawText) {
      const csv = Papa.parse(rawText, { header: true, skipEmptyLines: true, dynamicTyping: true });
      
      const hasHeaders = csv.meta.fields?.some(f => 
        ["nombre", "codigo", "descrip"].some(sh => f.toLowerCase().includes(sh))
      );

      if (hasHeaders) {
        productos = (csv.data as any[]).map(row => ({
          codigo: String(row.codigo || row.Codigo || row.code || "").trim(),
          nombre: String(row.nombre || row.Nombre || row.description || "").trim(),
          precio: parseFloat(String(row.precio || row.Precio || 0)),
          stock_actual: parseInt(String(row.stock || row.Stock || 0))
        })).filter(p => p.nombre.length > 0 || p.codigo.length > 0);
      }

      // FALLBACK: Si no hubo resultados por CSV (o no tiene cabeceras), tratar cada línea como un producto
      if (productos.length === 0) {
        productos = rawText.split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 1) 
          .map(name => ({ nombre: name, codigo: "", precio: 0, stock_actual: 0 }));
      }
    }

    if (productos.length === 0) {
      return NextResponse.json({ insertados: 0, mensaje: "Formato no reconocido" });
    }

    // 3. Smart Merge con Existentes
    const { data: existentes } = await db.from("productos").select("id, codigo, nombre, precio, stock_actual");
    const existingByCode = new Map(existentes?.map(e => [e.codigo.toLowerCase().trim(), e]));
    const existingByName = new Map(existentes?.map(e => [e.nombre.toLowerCase().trim(), e]));

    const finalBatch = productos.map(p => {
      const nombre = String(p.nombre).trim();
      const codigo = String(p.codigo).trim();
      
      let dbProd = null;
      if (codigo) dbProd = existingByCode.get(codigo.toLowerCase());
      if (!dbProd && nombre) dbProd = existingByName.get(nombre.toLowerCase());

      if (!dbProd) {
        // Nuevo producto
        return {
          ...p,
          codigo: codigo || `MED-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          itbis: 0.18, aplica_itbis: true, activo: true
        };
      }

      // Existe -> Smart Merge (No sobrescribir con ceros/vacíos)
      return {
        ...dbProd,
        precio: (Number(p.precio) > 0) ? p.precio : dbProd.precio,
        stock_actual: (Number(p.stock_actual) > 0) ? p.stock_actual : dbProd.stock_actual,
        updated_at: new Date().toISOString()
      };
    });

    // 4. Batch Upsert
    const { data: resultData, error } = await db.from("productos").upsert(finalBatch, { onConflict: "codigo" }).select("id");

    if (error) throw error;
    return NextResponse.json({ insertados: resultData?.length || 0 });

  } catch (err: any) {
    console.error("Bulk Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
