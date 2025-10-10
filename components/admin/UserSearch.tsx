"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface User {
  id: string;
  handle: string | null;
  display_name: string | null;
  email: string;
  email_verified: boolean;
  avatar_url: string | null;
  created_at: string;
  github_username: string | null;
  moderation?: {
    is_suspended: boolean;
    is_banned: boolean;
    warning_count: number;
  } | null;
}

interface UserSearchProps {
  initialUsers: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;
  filters: {
    query?: string;
    status?: string;
    verified?: boolean;
  };
}

export default function UserSearch({
  initialUsers,
  totalUsers,
  currentPage,
  pageSize,
  filters,
}: UserSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(filters.query || "");

  const totalPages = Math.ceil(totalUsers / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (filters.status) params.set("status", filters.status);
    if (filters.verified !== undefined) params.set("verified", String(filters.verified));
    router.push(`/admin/users?${params.toString()}` as any);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (value) params.set(key, value);
    if (key !== "status" && filters.status) params.set("status", filters.status);
    if (key !== "verified" && filters.verified !== undefined) params.set("verified", String(filters.verified));
    router.push(`/admin/users?${params.toString()}` as any);
  };

  const getUserStatusBadge = (user: User) => {
    if (user.moderation?.is_banned) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Banned</span>;
    }
    if (user.moderation?.is_suspended) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">Suspended</span>;
    }
    if (user.moderation?.warning_count && user.moderation.warning_count > 0) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        {user.moderation.warning_count} Warning{user.moderation.warning_count > 1 ? "s" : ""}
      </span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          {/* Search input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by handle, name, or email..."
            className="flex-1 min-w-[300px] border border-border-subtle rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="btn btn-accent">
            Search
          </button>

          {/* Status filter */}
          <select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>

          {/* Verified filter */}
          <select
            value={filters.verified === undefined ? "" : String(filters.verified)}
            onChange={(e) => handleFilterChange("verified", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>

          {/* Clear filters */}
          {(filters.query || filters.status || filters.verified !== undefined) && (
            <button
              type="button"
              onClick={() => router.push("/admin/users" as any)}
              className="btn btn-sm"
            >
              Clear Filters
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {initialUsers.length === 0 ? (
          <div className="card p-8 text-center text-text-secondary">
            No users found
          </div>
        ) : (
          initialUsers.map((user) => (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}` as any}
              className="card p-4 block hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar
                  src={user.avatar_url}
                  alt={user.display_name || user.handle || "User"}
                  name={user.display_name || user.handle || "User"}
                  size="md"
                />

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-text-primary">
                      {user.display_name || user.handle || "Unnamed User"}
                    </h3>
                    {user.handle && (
                      <span className="text-sm text-text-secondary">@{user.handle}</span>
                    )}
                    {getUserStatusBadge(user)}
                    {user.email_verified && (
                      <span className="text-xs text-blue-600">✓ Verified</span>
                    )}
                    {user.github_username && (
                      <span className="text-xs text-text-secondary">🔗 GitHub</span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-text-secondary">→</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (filters.query) params.set("q", filters.query);
              if (filters.status) params.set("status", filters.status);
              if (filters.verified !== undefined) params.set("verified", String(filters.verified));
              params.set("page", String(currentPage - 1));
              router.push(`/admin/users?${params.toString()}` as any);
            }}
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages} ({totalUsers.toLocaleString()} total)
          </span>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (filters.query) params.set("q", filters.query);
              if (filters.status) params.set("status", filters.status);
              if (filters.verified !== undefined) params.set("verified", String(filters.verified));
              params.set("page", String(currentPage + 1));
              router.push(`/admin/users?${params.toString()}` as any);
            }}
            disabled={currentPage === totalPages}
            className="btn btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
