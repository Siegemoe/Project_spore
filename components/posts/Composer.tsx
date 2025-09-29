"use client";

import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MEDIA_BUCKET, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_UPLOAD_BYTES } from "@/lib/config";
import { getUploadTarget, createPost } from "@/features/posts/actions";
import type { Route } from "next";

/**
 * Temporary prop signature — until auth is wired, we accept userId explicitly.
 * In Stage 1 we will derive userId from the server session and drop this prop.
 */
type ComposerProps = {
  userId?: string; // optional; auto-detect via Supabase auth when not provided
  onPosted?: () => void;
};

const IMAGE_TYPES = new Set<string>(ALLOWED_IMAGE_TYPES as readonly string[]);
const VIDEO_TYPES = new Set<string>(ALLOWED_VIDEO_TYPES as readonly string[]);

export default function Composer({ userId, onPosted }: ComposerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | undefined>(userId);

  // Auto-detect viewer from Supabase auth if not provided
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      if (viewerId) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setViewerId(data.user?.id);
        }
      } catch {
        // ignore
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  const contentType = useMemo(() => file?.type ?? "", [file]);
  const mediaType = useMemo<"image" | "video" | null>(() => {
    if (!file) return null;
    if (IMAGE_TYPES.has(file.type)) return "image";
    if (VIDEO_TYPES.has(file.type)) return "video";
    return null;
  }, [file]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setNote(`File too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`);
      e.currentTarget.value = "";
      setFile(null);
      return;
    }
    const ok = IMAGE_TYPES.has(f.type) || VIDEO_TYPES.has(f.type);
    if (!ok) {
      setNote("Unsupported file type. Use image/jpeg/png/webp/gif or video/mp4");
      e.currentTarget.value = "";
      setFile(null);
      return;
    }
    setNote(null);
    setFile(f);
  }

  function clearSelection() {
    setFile(null);
    setNote(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!viewerId) {
      setNote("Not signed in.");
      return;
    }
    if (!file) {
      setNote("Choose a file first.");
      return;
    }
    if (!mediaType) {
      setNote("Unsupported file type.");
      return;
    }

    try {
      setBusy(true);
      setNote(null);

      // 1) Ask server for upload target (objectPath)
      const target = await getUploadTarget({
        userId: viewerId,
        mediaType,
        contentType,
        size: file.size,
      });

      // 2) Upload to Supabase Storage from the client
      const up = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(target.objectPath, file, { contentType });
      if (up.error) throw up.error;

      // 3) Create post row referencing the objectPath
      await createPost({
        userId: viewerId,
        caption: caption.trim() || undefined,
        objectPath: target.objectPath,
        mediaType,
      });

      // 4) Reset UI and callback
      setCaption("");
      setFile(null);
      if (onPosted) onPosted();
      setNote("Posted!");
    } catch (err: any) {
      setNote(err?.message ?? "Could not post right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-3 max-w-2xl">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="media">
          Media
        </label>
        <input
          id="media"
          type="file"
          accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
          onChange={onPick}
          disabled={!viewerId || busy}
        />
        {previewUrl && mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="preview"
            className="mt-2 max-h-64 w-auto rounded-lg border border-neutral-200 object-contain"
          />
        )}
        {previewUrl && mediaType === "video" && (
          <video
            className="mt-2 max-h-64 w-auto rounded-lg border border-neutral-200"
            controls
            src={previewUrl}
          />
        )}
      </div>

      {file && (
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="truncate max-w-[50%]">{file.name}</span>
          <span>({(file.size / (1024 * 1024)).toFixed(1)}MB)</span>
          <button
            type="button"
            onClick={clearSelection}
            disabled={busy}
            className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="caption">
          Caption
        </label>
        <textarea
          id="caption"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))] min-h-[80px]"
          maxLength={2000}
          placeholder="Say something…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={!viewerId || busy}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !file || !mediaType || !viewerId}
          className="btn btn-accent disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post"}
        </button>
        {note && (
          <span role="status" aria-live="polite" className="text-sm text-neutral-600">
            {note}
          </span>
        )}
        {!viewerId && (
          <span className="text-sm text-neutral-600">
            Sign in to post.{" "}
            <a href="/auth/signin" className="link">Go to sign in</a>
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Max size {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB. Images: jpeg/png/webp/gif. Video: mp4.
      </p>
    </form>
  );
}
