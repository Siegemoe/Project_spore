import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/errors";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getOptionalUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
