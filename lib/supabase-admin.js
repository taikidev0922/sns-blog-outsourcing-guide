import { createClient } from "@supabase/supabase-js";

let client = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && getSupabaseServerKey());
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(process.env.SUPABASE_URL, getSupabaseServerKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}

export function getSupabaseProjectKey() {
  return process.env.SUPABASE_PROJECT_KEY || process.env.CONTENT_PROJECT_KEY || "sns-blog-outsourcing-guide";
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
