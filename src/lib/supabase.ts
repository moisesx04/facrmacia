import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role (server-side only)
// Cached as a singleton so the underlying HTTP connection pool is reused
let _adminClient: ReturnType<typeof createClient> | null = null;
export const supabaseAdmin = () => {
  if (_adminClient) return _adminClient;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
};
