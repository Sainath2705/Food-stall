import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

export function createServiceSupabaseClient() {
  const env = getServerEnv();

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
