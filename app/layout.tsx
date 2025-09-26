import type { Metadata, Route } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spore",
  description: "Vibe coders — publish MCPs, share projects, and connect.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <header className="nav container">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-black" aria-hidden />
            <span className="text-xl font-semibold tracking-tight">Spore</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href={"/auth/signin" as Route} className="btn btn-outline">Login</Link>
            <Link href={"/auth/signup" as Route} className="btn btn-accent">Sign Up</Link>
          </nav>
        </header>
        <main className="container py-10">{children}</main>
        <footer className="container py-10 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} Spore • Apache-2.0</p>
        </footer>
      </body>
    </html>
  );
}
