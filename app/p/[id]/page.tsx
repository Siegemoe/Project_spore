export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import PostCard from "@/components/posts/PostCard";
import CommentsClient from "@/components/comments/CommentsClient";

type PageProps = {
  params: { id: string };
};

export default async function PostDetailPage({ params }: PageProps) {
  const id = decodeURIComponent(params.id);

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      caption: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
    },
  });

  if (!post) {
    return (
      <div className="container py-10">
        <h1 className="text-xl font-semibold">Post not found</h1>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6 max-w-3xl">
      <PostCard
        id={post.id}
        user_id={post.userId}
        caption={post.caption}
        media_url={post.mediaUrl}
        media_type={post.mediaType}
        created_at={post.createdAt.toISOString()}
      />
      <section className="card p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-medium">Comments</h2>
        <CommentsClient postId={post.id} />
      </section>
    </div>
  );
}
