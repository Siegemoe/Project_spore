/**
 * Application configuration
 * Centralized config with environment variable validation
 */

// Supabase Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isSupabaseAdminConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE);

// Feature Flags
export const ENABLE_ADMIN_FEATURES = process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true" && isSupabaseAdminConfigured;
export const ENABLE_NEW_MOBILE_UI = process.env.NEXT_PUBLIC_NEW_MOBILE_UI === "true";

// App URLs
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Runtime configuration check
 * Logs warnings for missing critical config
 */
export function validateConfig() {
  const warnings: string[] = [];

  if (!isSupabaseConfigured) {
    warnings.push("Supabase not configured - auth features will be disabled");
  }

  if (!isSupabaseAdminConfigured) {
    warnings.push("Supabase admin not configured - admin features will be disabled");
  }

  if (warnings.length > 0 && typeof window === "undefined") {
    // Server-side only
    warnings.forEach(w => console.warn(`⚠️ Config: ${w}`));
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
