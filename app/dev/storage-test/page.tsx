"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";
import { MEDIA_BUCKET } from "@/lib/config";

/**
 * Dev-only storage verification page.
 * - Attempts to upload to the authenticated user's own prefix: {uid}/selftest-*.txt (expected: success)
 * - Attempts to upload to a foreign prefix: 00000000-0000-0000-0000-000000000000/selftest-*.txt (expected: failure)
 * - If the first upload succeeds, tries to fetch the public URL to verify read (expected: success for public bucket)
 *
 * Visit: /dev/storage-test
 */
export default function StorageTestPage() {
  const { data: session } = useSession();
  const uid = session?.user?.id ?? null;
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState<string>("");
  const [lastPublicUrl, setLastPublicUrl] = React.useState<string | null>(null);

  function append(msg: string) {
    setLog((prev) => (prev ? prev + "\n" + msg : msg));
  }

  async function testOwnUpload() {
    if (!uid) {
      append("Not signed in — cannot test own-prefix upload.");
      return;
    }
    try {
      setBusy(true);
      append(`Testing upload to own prefix for uid=${uid} ...`);
      const ts = Date.now();
      const path = `${uid}/selftest-${ts}.txt`;
      const file = new Blob([`ok-${ts}`], { type: "text/plain" });
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: "text/plain",
        upsert: false,
      });
      if (up.error) throw up.error;
      append(`Upload success: ${path}`);

      // Try public read
      const bucket = supabase.storage.from(MEDIA_BUCKET) as any;
      const pub = bucket.getPublicUrl(path);
      const url = pub.data.publicUrl;
      setLastPublicUrl(url);
      const res = await fetch(url, { method: "GET" });
      append(`Public read GET ${res.ok ? "OK" : `FAIL (${res.status})`}: ${url}`);

      // Cleanup (best-effort)
      await (supabase.storage.from(MEDIA_BUCKET) as any).remove([path]);
      append("Cleanup: removed uploaded test object.");
    } catch (e: any) {
      append("OWN UPLOAD ERROR: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function testForeignUpload() {
    try {
      setBusy(true);
      append("Testing upload to foreign prefix (expected: failure) ...");
      const foreign = "00000000-0000-0000-0000-000000000000";
      const ts = Date.now();
      const path = `${foreign}/selftest-${ts}.txt`;
      const file = new Blob([`forbidden-${ts}`], { type: "text/plain" });
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: "text/plain",
        upsert: false,
      });
      if (up.error) {
        append(`Foreign upload correctly failed: ${up.error.message}`);
      } else {
        append(`Foreign upload UNEXPECTEDLY SUCCEEDED: ${path} — check RLS!`);
        // Cleanup if it somehow succeeded
        await (supabase.storage.from(MEDIA_BUCKET) as any).remove([path]);
      }
    } catch (e: any) {
      append("FOREIGN UPLOAD ERROR (expected): " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container max-w-3xl py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Storage Self-Test</h1>
      <p className="text-sm text-text-secondary">
        Bucket: <code className="font-mono">{MEDIA_BUCKET}</code>
      </p>
      <p className="text-sm">
        Auth status:{" "}
        {uid ? (
          <span className="text-green-700">signed in</span>
        ) : (
          <span className="text-red-700">not signed in</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={testOwnUpload}
          className="btn btn-accent disabled:opacity-60"
          title="Upload to {uid}/selftest-*.txt (expects success) and test public read"
        >
          Test own-prefix upload + read
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={testForeignUpload}
          className="btn btn-outline disabled:opacity-60"
          title="Upload to foreign prefix (expects failure)"
        >
          Test foreign-prefix upload (expect fail)
        </button>
      </div>

      {lastPublicUrl ? (
        <div className="text-sm">
          Last public URL:{" "}
          <a href={lastPublicUrl} target="_blank" rel="noreferrer" className="link">
            {lastPublicUrl}
          </a>
        </div>
      ) : null}

      <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border-subtle bg-[rgb(var(--surface))] p-3 text-xs">
        {log || "Run a test to see results here..."}
      </pre>

      {!uid && (
        <p className="text-sm">
          Not signed in — go to{" "}
          <a className="link" href="/auth/signin">
            /auth/signin
          </a>{" "}
          first, then return.
        </p>
      )}
    </div>
  );
}
