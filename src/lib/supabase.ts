import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Lazily initialize client to avoid build-time crashes
let _supabase: ReturnType<typeof createClient> | null = null;
export const getSupabase = () => {
  if (_supabase) return _supabase;
  _supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return _supabase;
};

// For legacy code that still imports 'supabase' directly
export const supabase = _supabase || createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role (server-side only)
// Using any for generics to satisfy TypeScript 2.x and 3.x requirements in some IDEs
let _adminClient: SupabaseClient<any, any, any> | null = null;

export const supabaseAdmin = (): SupabaseClient<any, any, any> => {
  if (_adminClient) return _adminClient;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
};
