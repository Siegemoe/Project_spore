"use client";

import * as React from "react";
import { TopBar } from "@/components/nav/TopBar";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import DesktopSidebar from "@/components/nav/DesktopSidebar";
import { Sheet } from "@/components/ui/Sheet";
import dynamic from "next/dynamic";
import { CommentSheet } from "@/components/comments/CommentSheet";

// Lazy-load Composer to keep initial shell light
const Composer = dynamic(() => import("@/components/posts/Composer"), { ssr: false });

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [commentPostId, setCommentPostId] = React.useState<string | null>(null);

  React.useEffect(() => {
    function handleOpenComments(event: Event) {
      const custom = event as CustomEvent<{ postId?: string }>;
      const nextId = custom.detail?.postId ?? null;
      setCommentPostId(nextId);
    }

    window.addEventListener("spore:openComments", handleOpenComments as EventListener);
    return () => {
      window.removeEventListener("spore:openComments", handleOpenComments as EventListener);
    };
  }, []);

  return (
    <>
      <TopBar />
      <DesktopSidebar />
      {/* Add left padding on desktop for sidebar */}
      <main className="container pt-4 pb-20 md:pl-60">{children}</main>
      {/* Hide mobile tab bar on desktop */}
      <div className="md:hidden">
        <MobileTabBar onCreate={() => setOpen(true)} />
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Create a post"
        footer={null}
        className="max-w-xl"
      >
        <Composer
          onPosted={() => {
            setOpen(false);
          }}
        />
      </Sheet>
      <CommentSheet postId={commentPostId} onClose={() => setCommentPostId(null)} />
    </>
  );
}
