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
    location?: string | null;
    website?: string | null;
  };
  onSave?: (next: {
    display_name: string | null;
    bio: string | null;
    location?: string | null;
    website?: string | null;
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
  const [location, setLocation] = React.useState(initial.location ?? "");
  const [website, setWebsite] = React.useState(initial.website ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDisplayName(initial.display_name ?? "");
      setBio(initial.bio ?? "");
      setLocation(initial.location ?? "");
      setWebsite(initial.website ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    try {
      setSaving(true);
      await onSave?.({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
      });
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
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="About you" rows={4} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Website</label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
