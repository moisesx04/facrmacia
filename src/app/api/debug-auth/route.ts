import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() {
  const mask = (val: string | undefined) => 
    val ? `${val.substring(0, 10)}...${val.substring(val.length - 4)}` : "MISSING";

  const results: any = {
    env: {
      url: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anon: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      secret: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      auth: mask(process.env.NEXTAUTH_SECRET),
    },
    checks: [],
  };

  try {
    const db = supabaseAdmin();
    
    // 1. Check DB connection
    const { data: users, error: dbError } = await db.from("usuarios").select("email, rol").eq("email", "admin");
    
    if (dbError) {
      results.checks.push({ name: "Database connection", status: "❌ FAIL", error: dbError });
    } else {
      results.checks.push({ name: "Database connection", status: "✅ OK", detail: `Found ${users?.length} users with email 'admin'` });
    }

    if (users && users.length > 0) {
      // 2. Check hash
      const { data: fullUser } = await db.from("usuarios").select("*").eq("email", "admin").single();
      
      const testPassword = "admin1234@";
      const isMatch = await bcrypt.compare(testPassword, fullUser.password_hash);
      
      results.checks.push({ 
        name: "Password comparison test", 
        status: isMatch ? "✅ OK" : "❌ FAIL",
        detail: isMatch ? "Hashes match admin1234@" : "Hashes DO NOT match admin1234@"
      });

      // 3. Check reports query
      const { error: queryError } = await db
        .from("facturas")
        .select(`id, clientes(nombre), usuarios!usuario_id(nombre), factura_items(productos(nombre))`)
        .limit(1);

      if (queryError) {
        results.checks.push({ name: "Reports query test", status: "❌ FAIL", error: queryError });
      } else {
        results.checks.push({ name: "Reports query test", status: "✅ OK" });
      }

      // 4. Check bcrypt rounds
      const start = Date.now();
      await bcrypt.hash("test", 12);
      const duration = Date.now() - start;
      results.checks.push({ name: "Bcrypt speed test", status: "ℹ INFO", detail: `${duration}ms for 12 rounds` });
    }

  } catch (err: any) {
    results.error = err.message;
  }

  return NextResponse.json(results);
}
