let supabase = null;
let supabaseUrl = null;
let supabaseKey = null;

// Initialize Supabase lazily and asynchronously to avoid failing server startup
export function initSupabase() {
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[SUPABASE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Leaderboard will be disabled."
    );
    return false;
  }

  // Dynamically import the package so missing dependency does not crash startup
  (async () => {
    try {
      const mod = await import("@supabase/supabase-js");
      if (mod && typeof mod.createClient === "function") {
        supabase = mod.createClient(supabaseUrl, supabaseKey);
        console.log("[SUPABASE] initialized successfully");
      } else {
        console.warn("[SUPABASE] module loaded but createClient not found");
      }
    } catch (err) {
      console.warn("[SUPABASE] dynamic import failed; leaderboard disabled:", err?.message || err);
      supabase = null;
    }
  })();

  return true;
}

export function getSupabase() {
  return supabase;
}

export function isSupabaseReady() {
  return !!supabase;
}
