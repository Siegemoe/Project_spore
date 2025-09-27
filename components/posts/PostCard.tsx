
export type PostCardProps = {
  id: string;
  user_id: string;
  caption?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string; // ISO
};

export default function PostCard({ caption, media_url, media_type, created_at }: PostCardProps) {
  const when = new Date(created_at).toLocaleString();

  return (
    <article className="card p-4 sm:p-6 space-y-3 max-w-2xl">
      <div className="text-sm text-neutral-500">{when}</div>
      {caption && <p className="text-[15px] leading-relaxed">{caption}</p>}
      {media_url && media_type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media_url}
          alt="post media"
          className="rounded-lg border border-neutral-200 max-h-[480px] object-contain w-full bg-neutral-50"
        />
      )}
      {media_url && media_type === "video" && (
        <video
          className="rounded-lg border border-neutral-200 w-full bg-black"
          controls
          src={media_url}
        />
      )}
    </article>
  );
}
