"use client";

import * as React from "react";

type PillProps = {
  label: string;
  value: string | number;
  title?: string;
};

function StatPill({ label, value, title }: PillProps) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1 text-xs text-text-primary"
      title={title}
      aria-label={`${label}: ${value}`}
    >
      <span className="font-medium">{value}</span>
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}

export type StatsRowProps = {
  reposCount?: number; // public repos
  contributionsText?: string; // e.g., "123 posts + comments"
  accountAgeText?: string; // e.g., "1y 3m"
};

export function StatsRow({ reposCount, contributionsText, accountAgeText }: StatsRowProps) {
  const hasRepos = typeof reposCount === "number";
  const hasContrib = typeof contributionsText === "string" && contributionsText.length > 0;
  const hasAge = typeof accountAgeText === "string" && accountAgeText.length > 0;

  if (!hasRepos && !hasContrib && !hasAge) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 pt-3">
      {hasRepos ? <StatPill label="Repos" value={reposCount!} /> : null}
      {hasContrib ? <StatPill label="Contributions" value={contributionsText!} /> : null}
      {hasAge ? <StatPill label="Account age" value={accountAgeText!} /> : null}
    </div>
  );
}

export default StatsRow;
