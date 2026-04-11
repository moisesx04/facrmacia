import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acceso restringido a administradores" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const hasta = searchParams.get("hasta") || new Date().toISOString().split("T")[0];
  const formato = searchParams.get("formato") || "json";

  const { data, error } = await db
    .from("facturas")
    .select(`id, ncf, ncf_tipo, subtotal, itbis_total, descuento, total, metodo_pago, estado, created_at, ganancia,
      clientes(nombre, cedula_rnc),
      usuarios!usuario_id(nombre),
      factura_items(cantidad, precio_unitario, subtotal, productos(nombre, codigo))`)
    .gte("created_at", desde)
    .lte("created_at", hasta + "T23:59:59")
    .neq("estado", "anulada")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (formato === "csv") {
    const rows = [
      "Fecha,NCF,Tipo,Cliente,RNC,Vendedor,Subtotal,ITBIS,Descuento,Total,Método Pago,Estado",
      ...(data || []).map((f) => {
        const cliente = (f.clientes as unknown) as { nombre: string; cedula_rnc: string } | null;
        const usuario = (f.usuarios as unknown) as { nombre: string } | null;
        return [
          new Date(f.created_at).toLocaleDateString("es-DO"),
          f.ncf, f.ncf_tipo,
          cliente?.nombre || "", cliente?.cedula_rnc || "",
          usuario?.nombre || "",
          f.subtotal, f.itbis_total, f.descuento, f.total,
          f.metodo_pago, f.estado,
        ].join(",");
      }),
    ].join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ventas_${desde}_${hasta}.csv"`,
      },
    });
  }

  // Resumen para JSON
  const resumen = {
    total_facturas: data?.length || 0,
    total_ventas: data?.reduce((s, f) => s + Number(f.total), 0) || 0,
    total_cobrado: data?.filter((f) => f.estado === "pagada").reduce((s, f) => s + Number(f.total), 0) || 0,
    cuentas_por_cobrar: data?.filter((f) => f.estado === "pendiente").reduce((s, f) => s + Number(f.total), 0) || 0,
    utilidad_bruta: data?.filter((f) => f.estado === "pagada").reduce((s, f: any) => s + Number(f.ganancia || 0), 0) || 0,
    total_itbis: data?.reduce((s, f) => s + Number(f.itbis_total), 0) || 0,
    total_descuentos: data?.reduce((s, f) => s + Number(f.descuento), 0) || 0,
    por_metodo_pago: data?.reduce((acc, f) => {
      acc[f.metodo_pago] = (acc[f.metodo_pago] || 0) + Number(f.total);
      return acc;
    }, {} as Record<string, number>),
    facturas: data,
  };

  return NextResponse.json(resumen);
}
