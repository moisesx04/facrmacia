import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() {
  const results: any = {
    env: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      secret: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      auth: !!process.env.NEXTAUTH_SECRET,
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

      // 3. Check bcrypt rounds
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
