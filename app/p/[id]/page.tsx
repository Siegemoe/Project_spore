export const dynamic = "force-dynamic";

import PostCard from "@/components/posts/PostCard";
import CommentsClient from "@/components/comments/CommentsClient";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";

type PageProps = {
  params: { id: string };
};

export default async function PostDetailPage({ params }: PageProps) {
  const id = decodeURIComponent(params.id);

  if (!hasSupabaseAdminEnv()) {
    return (
      <div className="container py-10 space-y-4">
        <h1 className="text-xl font-semibold">Post</h1>
        <p className="text-sm text-neutral-600">
          Supabase environment variables are not set in this environment, so post data cannot be loaded.
        </p>
      </div>
    );
  }

  const admin = getSupabaseAdmin();
  const { data: post, error } = await admin
    .from("posts")
    .select("id,user_id,caption,media_url,media_type,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

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
        user_id={post.user_id}
        caption={post.caption}
        media_url={post.media_url}
        media_type={post.media_type}
        created_at={post.created_at}
      />
      <section className="card p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-medium">Comments</h2>
        <CommentsClient postId={post.id} />
      </section>
    </div>
  );
}
