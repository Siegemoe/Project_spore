import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications • Spore",
  description: "Mentions, follows, and comments."
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-text-primary">Notifications</h1>
        <p className="text-sm text-text-secondary">Stub page — recent follows and comments will appear here.</p>
      </header>

      <div className="grid gap-3">
        <div className="card p-4">
          <p className="text-sm text-text-secondary">Coming soon: notifications feed.</p>
        </div>
      </div>
    </div>
  );
}
