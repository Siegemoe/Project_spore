"use client";

import CommentsClient from "@/components/comments/CommentsClient";
import { Sheet } from "@/components/ui/Sheet";

type CommentSheetProps = {
  postId: string | null;
  onClose: () => void;
};

export function CommentSheet({ postId, onClose }: CommentSheetProps) {
  const open = Boolean(postId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Comments"
      className="max-w-xl max-h-[85vh] overflow-hidden"
    >
      <div className="max-h-[70vh] overflow-y-auto px-1 pb-4">
        {postId ? <CommentsClient postId={postId} /> : null}
      </div>
    </Sheet>
  );
}
