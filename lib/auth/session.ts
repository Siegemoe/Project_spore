import { getServerSupabase } from "@/lib/supabaseServer";
import { UnauthorizedError } from "@/lib/errors";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // Supabase returns an error when no session cookie exists; treat as unauthenticated.
    return null;
  }

  const user = data.user;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? undefined,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getOptionalUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
