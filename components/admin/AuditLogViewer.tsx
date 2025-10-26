"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin: {
    role: string;
    user: {
      handle: string | null;
      display_name: string | null;
    };
  };
}

interface AuditLogViewerProps {
  initialLogs: AuditLog[];
  totalLogs: number;
  currentPage: number;
  pageSize: number;
  filters: {
    admin_id?: string;
    action?: string;
    resource_type?: string;
  };
}

export default function AuditLogViewer({
  initialLogs,
  totalLogs,
  currentPage,
  pageSize,
  filters,
}: AuditLogViewerProps) {
  const router = useRouter();
  const totalPages = Math.ceil(totalLogs / pageSize);
  
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (filters.admin_id) params.set("admin_id", filters.admin_id);
    if (filters.action) params.set("action", filters.action);
    if (filters.resource_type) params.set("resource_type", filters.resource_type);
    return `/admin/audit?${params.toString()}`;
  };
  
  // Local state for action filter input to prevent immediate navigation
  const [actionInput, setActionInput] = useState(filters.action || "");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when filters prop changes (e.g., from URL changes)
  useEffect(() => {
    setActionInput(filters.action || "");
  }, [filters.action]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (value) params.set(key, value);
    if (filters.admin_id && key !== "admin_id") params.set("admin_id", filters.admin_id);
    if (filters.action && key !== "action") params.set("action", filters.action);
    if (filters.resource_type && key !== "resource_type") params.set("resource_type", filters.resource_type);
    router.push(`/admin/audit?${params.toString()}` as any);
  };

  // Debounced handler for action filter
  const handleActionInputChange = (value: string) => {
    setActionInput(value);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout for debounced navigation
    debounceTimeoutRef.current = setTimeout(() => {
      handleFilterChange("action", value);
    }, 300);
  };
  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("ban")) return "bg-red-100 text-red-800";
    if (action.includes("suspend") || action.includes("warn")) return "bg-orange-100 text-orange-800";
    if (action.includes("create") || action.includes("grant")) return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionInput}
            onChange={(e) => handleActionInputChange(e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          />
          
          <select
            value={filters.resource_type || ""}
            onChange={(e) => handleFilterChange("resource_type", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Resource Types</option>
            <option value="user">User</option>
            <option value="post">Post</option>
            <option value="comment">Comment</option>
            <option value="content_report">Content Report</option>
            <option value="security_event">Security Event</option>
            <option value="system">System</option>
          </select>

          {(filters.action || filters.resource_type) && (
            <button
              onClick={() => router.push("/admin/audit" as any)}
              className="btn btn-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs list */}
      <div className="space-y-3">
        {initialLogs.length === 0 ? (
          <div className="card p-8 text-center text-text-secondary">
            No audit logs found
          </div>
        ) : (
          initialLogs.map((log) => (
            <div key={log.id} className="card p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {log.resource_type}
                    </span>
                    {log.resource_id && (
                      <span className="text-xs text-text-secondary font-mono">
                        ID: {log.resource_id.length > 8 ? `${log.resource_id.substring(0, 8)}...` : log.resource_id}
                      </span>
                    )}                    <span className="text-xs text-text-secondary ml-auto">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-text-primary mb-2">
                    <span className="font-medium">Admin:</span>{" "}
                    {log.admin.user.display_name || log.admin.user.handle || "Unknown"} ({log.admin.role})
                  </p>

                  {log.ip_address && (
                    <p className="text-xs text-text-secondary">
                      IP: {log.ip_address}
                    </p>
                  )}

                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-text-secondary hover:text-text-primary">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-[rgb(var(--surface-muted))] rounded text-xs overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.push(buildPageUrl(currentPage - 1) as any)}
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages} ({totalLogs.toLocaleString()} total)
          </span>
          <button
            onClick={() => router.push(buildPageUrl(currentPage + 1) as any)}
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
