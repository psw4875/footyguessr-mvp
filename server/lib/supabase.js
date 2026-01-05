import { createClient } from "@supabase/supabase-js";

let supabase = null;
let supabaseUrl = null;
let supabaseKey = null;

export function initSupabase() {
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log("[SUPABASE] initialized successfully");
      return true;
    } catch (err) {
      console.error("[SUPABASE] initialization failed:", err.message);
      return false;
    }
  } else {
    console.warn(
      "[SUPABASE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Leaderboard will be disabled."
    );
    return false;
  }
}

export function getSupabase() {
  return supabase;
}

export function isSupabaseReady() {
  return !!supabase;
}
