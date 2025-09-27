"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/Sheet";
import dynamic from "next/dynamic";

const CommentsClient = dynamic(() => import("./CommentsClient"), { ssr: false });

export interface CommentSheetHandle {
  open: (postId: string) => void;
  close: () => void;
}

export function useCommentSheetController() {
  const [postId, setPostId] = React.useState<string | null>(null);
  const open = React.useCallback((pid: string) => setPostId(pid), []);
  const close = React.useCallback(() => setPostId(null), []);
  return { postId, open, close };
}

export function CommentSheet({
  postId,
  onClose
}: {
  postId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={Boolean(postId)}
      onClose={onClose}
      title="Comments"
      footer={null}
      className="max-w-xl"
    >
      {postId ? <CommentsClient postId={postId} /> : null}
    </Sheet>
  );
}

/**
 * Global event subscription helper.
 * Dispatch anywhere: window.dispatchEvent(new CustomEvent("spore:openComments", { detail: { postId } }))
 */
export function useGlobalCommentEvents(onOpen: (postId: string) => void) {
  React.useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<{ postId?: string }>;
      const pid = ce.detail?.postId;
      if (pid) onOpen(pid);
    }
    window.addEventListener("spore:openComments", handler as any);
    return () => window.removeEventListener("spore:openComments", handler as any);
  }, [onOpen]);
}
