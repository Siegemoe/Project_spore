"use client";

import * as React from "react";
import { TopBar } from "@/components/nav/TopBar";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { Sheet } from "@/components/ui/Sheet";
import dynamic from "next/dynamic";
import { CommentSheet, useGlobalCommentEvents } from "@/components/comments/CommentSheet";

// Lazy-load Composer to keep initial shell light
const Composer = dynamic(() => import("@/components/posts/Composer"), { ssr: false });

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [commentPostId, setCommentPostId] = React.useState<string | null>(null);
  useGlobalCommentEvents((postId) => setCommentPostId(postId));

  return (
    <>
      <TopBar />
      <main className="container pt-4 pb-20">{children}</main>
      <MobileTabBar onCreate={() => setOpen(true)} />
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
