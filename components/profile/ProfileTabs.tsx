"use client";

import * as React from "react";
import { RepoList } from "@/components/profile/RepoList";
import PostsTab from "@/components/profile/PostsTab";
import CommentsTab from "@/components/profile/CommentsTab";

type About = {
  bio?: string | null;
  links?: Array<{ label: string; href: string }>;
};

export interface ProfileTabsProps {
  repos: Parameters<typeof RepoList>[0]["repos"];
  reposError?: string | undefined;
  about: About;
  posts?: {
    userId: string;
    initialItems: Array<{
      id: string;
      user_id: string;
      caption: string | null;
      media_url: string | null;
      media_type: string | null;
      created_at: string;
    }>;
    initialNextCursor?: string;
  };
  // Placeholder for future posts list
  postsPlaceholder?: React.ReactNode;
}

const TabKeys = ["posts", "comments", "about"] as const;
type TabKey = typeof TabKeys[number];

export function ProfileTabs({ repos, reposError, about, posts, postsPlaceholder }: ProfileTabsProps) {
  const [tab, setTab] = React.useState<TabKey>("posts");

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
          Posts
        </TabButton>
        <TabButton active={tab === "comments"} onClick={() => setTab("comments")}>
          Comments
        </TabButton>
        <TabButton active={tab === "about"} onClick={() => setTab("about")}>
          About
        </TabButton>
      </div>

      <div>
        {tab === "posts" ? (
          posts ? (
            <PostsTab
              userId={posts.userId}
              initialItems={posts.initialItems}
              initialNextCursor={posts.initialNextCursor}
            />
          ) : (
            postsPlaceholder ?? (
              <div className="card p-4">
                <p className="text-sm text-text-secondary">User posts will appear here in a later milestone.</p>
              </div>
            )
          )
        ) : tab === "comments" ? (
          posts ? <CommentsTab userId={posts.userId} /> : <div className="card p-4 text-sm text-text-secondary">No comments.</div>
        ) : (
          <div className="space-y-3">
            <div className="card p-4 space-y-2">
              {about.bio ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{about.bio}</p>
              ) : (
                <p className="text-sm text-text-secondary">No bio yet.</p>
              )}
              {about.links && about.links.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {about.links.map((l, i) => (
                    <a
                      key={`${l.href}-${i}`}
                      className="inline-flex items-center rounded-full border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-[rgb(var(--surface-muted))]"
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.label || l.href}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Repositories preview within About */}
            {(repos && repos.length > 0) || reposError ? (
              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-secondary">Repositories</h3>
                  {reposError ? (
                    <span className="text-xs text-red-600">GitHub data unavailable</span>
                  ) : null}
                </div>
                {repos && repos.length > 0 ? <RepoList repos={repos} /> : <p className="text-sm text-text-secondary">No public repos found.</p>}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-accent text-white bg-accent"
          : "border-border-subtle text-text-primary hover:bg-[rgb(var(--surface-muted))]"
      ].join(" ")}
    >
      {children}
    </button>
  );
}
