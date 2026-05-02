import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && user.id) {
        const githubLogin = (profile as any)?.login as string | undefined;
        const displayName =
          ((profile as any)?.name as string | undefined) ?? user.name;
        const avatarUrl =
          ((profile as any)?.avatar_url as string | undefined) ?? user.image;

        // Derive handle from GitHub login
        const base = (githubLogin || `user-${user.id.slice(0, 6)}`)
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "");
        const handle = base || `user-${user.id.slice(0, 6)}`;

        // Ensure handle uniqueness
        const existing = await prisma.user.findFirst({
          where: { handle: { equals: handle, mode: "insensitive" } },
        });
        const finalHandle =
          existing && existing.id !== user.id
            ? `${handle}-${user.id.slice(0, 4)}`
            : handle;

        // Update user profile
        await prisma.user.update({
          where: { id: user.id },
          data: {
            handle: finalHandle,
            displayName: displayName || undefined,
            avatarUrl: avatarUrl || undefined,
            name: displayName || undefined,
            image: avatarUrl || undefined,
            githubHandle: githubLogin || undefined,
          },
        });

        // Upsert git_accounts
        if (githubLogin) {
          const existingGit = await prisma.gitAccount.findFirst({
            where: { userId: user.id },
          });
          if (existingGit) {
            await prisma.gitAccount.update({
              where: { id: existingGit.id },
              data: { githubLogin },
            });
          } else {
            await prisma.gitAccount.create({
              data: { userId: user.id, githubLogin },
            });
          }
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
