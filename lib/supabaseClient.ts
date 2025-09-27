import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

type UploadResult = { data: any; error: any };

type NoopChannel = {
  on: (..._args: any[]) => NoopChannel;
  subscribe: (..._args: any[]) => any;
};

function makeStubClient() {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env missing: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Falling back to a no-op client for dev builds without env."
  );

  const noopUpload = async (..._args: any[]): Promise<UploadResult> => ({
    data: null,
    error: new Error("Supabase is not configured (missing env)."),
  });

  const channel: NoopChannel = {
    on() {
      return this;
    },
    subscribe() {
      return {};
    },
  };

  return {
    storage: {
      from: (_bucket: string) => ({
        upload: noopUpload,
      }),
    },
    channel: (_name: string) => channel,
    removeChannel: (_c: any) => {
      /* no-op */
    },
    auth: {
      async getUser() {
        return { data: { user: null } };
      },
      async getSession() {
        return { data: { session: null } };
      },
      async signInWithOAuth(_opts: any) {
        // eslint-disable-next-line no-console
        console.warn("Supabase is not configured; signInWithOAuth noop.");
        return { data: null, error: new Error("Supabase not configured") };
      },
    },
  };
}

export const supabase: SupabaseClient | ReturnType<typeof makeStubClient> =
  isSupabaseConfigured && supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon, {
        auth: {
          // Persist session in localStorage so auth survives route changes and reloads
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Explicitly set storage to avoid environments that default to memory
          storage:
            typeof window !== "undefined" && "localStorage" in window
              ? window.localStorage
              : undefined,
        },
        // Realtime should broadcast auth across tabs; enabled by default, keep defaults
      })
    : makeStubClient();
