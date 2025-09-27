import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnon);

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
    on: function on() {
      return this;
    },
    subscribe: function subscribe() {
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
  } as const;
}

export const supabase =
  isSupabaseConfigured && supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon)
    : (makeStubClient() as unknown as ReturnType<typeof createClient>);
