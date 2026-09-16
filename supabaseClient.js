import { createClient } from "@supabase/supabase-js";

// This "publishable" key is designed to be used in client-side code.
// Data access is controlled by Row Level Security policies on the
// Supabase project itself, not by keeping this key secret.
const SUPABASE_URL = "https://amizihrsgnkzwpcywclk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dYYGKys85OsFaJhM2zPuOQ_E-ARmOBH";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const IMAGE_BUCKET = "portfolio-images";
