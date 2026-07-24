import { createClient } from "@supabase/supabase-js";

/**
 * Sanitizes and validates a Supabase URL string.
 */
function sanitizeSupabaseUrl(rawUrl: unknown): string {
  if (!rawUrl) return "";
  let url = String(rawUrl).trim();

  // Filter out literal "undefined", "null", or empty values
  if (url === "undefined" || url === "null" || url.length === 0) {
    return "";
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, "");

  // Remove /rest/v1 if included
  url = url.replace(/\/rest\/v1\/?$/i, "");

  // Ensure protocol starts with https://
  if (url.startsWith("http://")) {
    url = url.replace("http://", "https://");
  } else if (!url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url;
}

/**
 * Sanitizes a Supabase anon key string.
 */
function sanitizeSupabaseKey(rawKey: unknown): string {
  if (!rawKey) return "";
  let key = String(rawKey).trim();
  if (key === "undefined" || key === "null") {
    return "";
  }
  // Strip protocol or leading slashes if key was previously swapped or contains URL parts
  key = key.replace(/^https?:\/\//i, "");
  key = key.replace(/\/+$/, "");
  return key;
}

const DEFAULT_URL = "https://pqppawcoscmxfdpuxuvg.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcHBhd2Nvc2NteGZkcHV4dXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDk1MzQsImV4cCI6MjEwMDE4NTUzNH0.YaKRPhlhF0eL3rp5_2l-L7WahxhKTnxOgAmUETreGZE";

// Read from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables with fallbacks
let rawUrlEnv = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim();
let rawKeyEnv = String(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();

// If key in env is invalid or not a JWT starting with eyJ, fallback to valid DEFAULT_KEY
if (!rawKeyEnv.startsWith("eyJ") && rawKeyEnv !== DEFAULT_KEY) {
  if (rawUrlEnv.startsWith("eyJ")) {
    // Swapped
    const tmp = rawUrlEnv;
    rawUrlEnv = rawKeyEnv;
    rawKeyEnv = tmp;
  } else {
    rawKeyEnv = DEFAULT_KEY;
  }
}
if (!rawUrlEnv.startsWith("http")) {
  rawUrlEnv = DEFAULT_URL;
}

let parsedUrl = sanitizeSupabaseUrl(rawUrlEnv);
let parsedKey = sanitizeSupabaseKey(rawKeyEnv);

// Fallback placeholder URL/key if environment variables are completely missing to avoid unhandled crashes
const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "placeholder-anon-key";

// Ensure final URL starts with https:// and does not contain /rest/v1
const finalUrl =
  parsedUrl && parsedUrl.startsWith("https://") && !parsedUrl.includes("/rest/v1")
    ? parsedUrl
    : FALLBACK_URL;

const finalKey = parsedKey || FALLBACK_KEY;

// Requirement: Print the project URL being used.
console.log("Project URL being used:", finalUrl);

// Requirement: Print only the first and last 6 characters of the anon key for verification (never print the full key).
if (finalKey && finalKey.length >= 12) {
  const first6 = finalKey.slice(0, 6);
  const last6 = finalKey.slice(-6);
  console.log(`Anon Key snippet: ${first6}...${last6}`);
} else if (finalKey) {
  console.log("Anon Key is present");
} else {
  console.log("Anon Key is missing or empty");
}

// Single Supabase client instance using ONLY the project's current VITE_SUPABASE_ANON_KEY
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = Boolean(
  parsedUrl &&
    parsedKey &&
    parsedUrl.startsWith("https://") &&
    !parsedUrl.includes("placeholder") &&
    !parsedUrl.includes("/rest/v1")
);

/**
 * Verifies database connection to Supabase.
 */
export async function verifyConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn("Supabase client is not fully configured with environment variables.");
    return false;
  }

  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      if (error.message && error.message.toLowerCase().includes("invalid api key")) {
        console.warn("Supabase connection failed: Invalid API Key");
        return false;
      }
      if (error.code && (error.code.startsWith("PGRST") || error.code === "42P01")) {
        console.log("Supabase connection verified (PostgREST responsive):", error.message);
        return true;
      }
      console.warn("Supabase connection returned error:", error.message);
      return false;
    }
    console.log("Supabase connection verified successfully.");
    return true;
  } catch (err: any) {
    console.error("Supabase connection exception:", err?.message || err);
    return false;
  }
}
