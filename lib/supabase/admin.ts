import { createClient } from "@supabase/supabase-js";

// Admin client with service role key for server-side operations
// This bypasses RLS - use only in secure server contexts (webhooks, etc.)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

