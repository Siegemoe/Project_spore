"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: {
    display_name: string | null;
    bio: string | null;
    websites?: string[];
    email_public?: boolean;
  };
  onSave?: (next: {
    display_name: string | null;
    bio: string | null;
    websites?: string[];
    email_public?: boolean;
  }) => Promise<void> | void;
};

/**
 * EditProfileSheet
 * - Uses our custom Sheet component API (open, onClose, title, footer)
 * - No persistence yet; onSave is optional callback provided by parent
 */
export default function EditProfileSheet({ open, onOpenChange, initial, onSave }: Props) {
  const [displayName, setDisplayName] = React.useState(initial.display_name ?? "");
  const [bio, setBio] = React.useState(initial.bio ?? "");
  const [websites, setWebsites] = React.useState<string[]>([]);
  const [emailPublic, setEmailPublic] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDisplayName(initial.display_name ?? "");
      setBio(initial.bio ?? "");
      setWebsites(initial.websites ?? []);
      setEmailPublic(initial.email_public ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const addWebsite = () => {
    if (websites.length < 5) {
      setWebsites([...websites, ""]);
    }
  };

  const removeWebsite = (index: number) => {
    setWebsites(websites.filter((_, i) => i !== index));
  };

  const updateWebsite = (index: number, value: string) => {
    const newWebsites = [...websites];
    newWebsites[index] = value;
    setWebsites(newWebsites);
  };

  async function handleSave() {
    try {
      setSaving(true);
      // If parent provided a handler, call it; otherwise, call our API
      if (onSave) {
        await onSave({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        });
      } else {
        const res = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim() || undefined,
            bio: bio.trim() || undefined,
            websites: websites.filter(w => w.trim()).map(w => w.trim()),
            email_public: emailPublic,
          }),
        });
        if (!res.ok) {
          // minimal error feedback
          console.error("Profile update failed");
        } else {
          // Reload to reflect changes
          if (typeof window !== "undefined") window.location.reload();
        }
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Edit profile"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
      className="max-h-[85vh]"
    >
      <div className="mt-2 space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Display name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Bio</label>
          <Textarea 
            value={bio} 
            onChange={(e) => setBio(e.target.value)} 
            placeholder="About you" 
            rows={4}
            maxLength={500}
          />
          <div className="text-xs text-text-secondary mt-1">{bio.length}/500</div>
        </div>

        {/* Websites */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Websites (max 5)
          </label>
          <div className="space-y-2">
            {websites.map((website, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={website}
                  onChange={(e) => updateWebsite(index, e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => removeWebsite(index)}
                  className="px-3"
                >
                  ✕
                </Button>
              </div>
            ))}
            {websites.length < 5 && (
              <Button
                variant="outline"
                onClick={addWebsite}
                className="w-full"
              >
                + Add Website
              </Button>
            )}
          </div>
        </div>

        {/* Email Visibility */}
        <div className="flex items-center gap-3 p-3 bg-[rgb(var(--surface-muted))] rounded">
          <input
            type="checkbox"
            id="email-public"
            checked={emailPublic}
            onChange={(e) => setEmailPublic(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="email-public" className="text-sm text-text-primary cursor-pointer">
            Show my email address in my public profile
          </label>
        </div>
      </div>
    </Sheet>
  );
}
