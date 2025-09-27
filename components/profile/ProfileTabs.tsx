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

const TabKeys = ["posts", "comments", "repos", "about"] as const;
type TabKey = typeof TabKeys[number];

export function ProfileTabs({ repos, about, posts, postsPlaceholder }: ProfileTabsProps) {
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
        <TabButton active={tab === "repos"} onClick={() => setTab("repos")}>
          Repos
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
        ) : tab === "repos" ? (
          <RepoList repos={repos} />
        ) : (
          <div className="card p-4 space-y-2">
            {about.bio ? (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{about.bio}</p>
            ) : (
              <p className="text-sm text-text-secondary">No bio yet.</p>
            )}
            {about.links && about.links.length > 0 ? (
              <ul className="mt-2 list-disc list-inside text-sm">
                {about.links.map((l, i) => (
                  <li key={`${l.href}-${i}`}>
                    <a className="underline underline-offset-2" href={l.href} target="_blank" rel="noreferrer">
                      {l.label || l.href}
                    </a>
                  </li>
                ))}
              </ul>
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
