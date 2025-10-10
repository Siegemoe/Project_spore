"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  removeContent, 
  warnUser, 
  suspendUser, 
  banUser, 
  dismissReport,
  updateReportStatus,
  bulkUpdateReports 
} from "@/features/moderation/actions";

interface Reporter {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string;
  severity: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  resolution_action: string | null;
  created_at: string;
  updated_at: string;
  reporter: Reporter;
}

interface ModerationQueueProps {
  initialReports: Report[];
  totalReports: number;
  currentPage: number;
  pageSize: number;
  filters: {
    status?: string;
    content_type?: string;
  };
}

export default function ModerationQueue({
  initialReports,
  totalReports,
  currentPage,
  pageSize,
  filters,
}: ModerationQueueProps) {
  const router = useRouter();
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [actioningReport, setActioningReport] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  const totalPages = Math.ceil(totalReports / pageSize);

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (value) params.set(key, value);
    if (filters.status && key !== "status") params.set("status", filters.status);
    if (filters.content_type && key !== "type") params.set("type", filters.content_type);
    router.push(`/admin/moderation?${params.toString()}` as any);
  };

  // Selection handlers
  const toggleSelection = (reportId: string) => {
    const newSelection = new Set(selectedReports);
    if (newSelection.has(reportId)) {
      newSelection.delete(reportId);
    } else {
      newSelection.add(reportId);
    }
    setSelectedReports(newSelection);
  };

  const selectAll = () => {
    if (selectedReports.size === initialReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(initialReports.map(r => r.id)));
    }
  };

  // Action handlers
  const handleRemoveContent = async (report: Report) => {
    if (!confirm("Are you sure you want to remove this content?")) return;
    
    setActioningReport(report.id);
    try {
      await removeContent(
        report.id,
        report.content_type as "post" | "comment",
        report.content_id,
        `Report reason: ${report.reason}`
      );
      router.refresh();
    } catch (error: any) {
      alert(`Failed to remove content: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  const handleWarnUser = async (report: Report, userId: string) => {
    const reason = prompt("Reason for warning:");
    if (!reason) return;
    
    setActioningReport(report.id);
    try {
      await warnUser(report.id, userId, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed to warn user: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  const handleSuspendUser = async (report: Report, userId: string) => {
    const reason = prompt("Reason for suspension:");
    if (!reason) return;
    
    const daysStr = prompt("Duration in days:", "7");
    if (!daysStr) return;
    
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1) {
      alert("Invalid duration");
      return;
    }
    
    setActioningReport(report.id);
    try {
      await suspendUser(report.id, userId, reason, days);
      router.refresh();
    } catch (error: any) {
      alert(`Failed to suspend user: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  const handleBanUser = async (report: Report, userId: string) => {
    const reason = prompt("Reason for permanent ban:");
    if (!reason) return;
    
    if (!confirm("Are you sure you want to PERMANENTLY ban this user?")) return;
    
    setActioningReport(report.id);
    try {
      await banUser(report.id, userId, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed to ban user: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  const handleDismiss = async (report: Report) => {
    const reason = prompt("Reason for dismissal:", "No violation found");
    if (!reason) return;
    
    setActioningReport(report.id);
    try {
      await dismissReport(report.id, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed to dismiss report: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  const handleMarkReviewing = async (report: Report) => {
    setActioningReport(report.id);
    try {
      await updateReportStatus(report.id, "reviewing");
      router.refresh();
    } catch (error: any) {
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setActioningReport(null);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: "dismiss" | "escalate") => {
    if (selectedReports.size === 0) {
      alert("No reports selected");
      return;
    }

    const reason = prompt(
      action === "dismiss" 
        ? "Reason for bulk dismissal:" 
        : "Reason for bulk escalation:"
    );
    if (!reason) return;

    try {
      await bulkUpdateReports(Array.from(selectedReports), action, reason);
      setSelectedReports(new Set());
      router.refresh();
    } catch (error: any) {
      alert(`Failed to perform bulk action: ${error.message}`);
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      spam: "bg-yellow-100 text-yellow-800",
      harassment: "bg-red-100 text-red-800",
      hate_speech: "bg-red-100 text-red-800",
      violence: "bg-red-100 text-red-800",
      sexual_content: "bg-pink-100 text-pink-800",
      misinformation: "bg-orange-100 text-orange-800",
      copyright: "bg-purple-100 text-purple-800",
      impersonation: "bg-blue-100 text-blue-800",
      self_harm: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[reason] || colors.other;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-orange-100 text-orange-800",
      reviewing: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
      dismissed: "bg-gray-100 text-gray-800",
      escalated: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-4">
      {/* Filters and bulk actions */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="escalated">Escalated</option>
          </select>

          {/* Content type filter */}
          <select
            value={filters.content_type || ""}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="profile">Profiles</option>
            <option value="user">Users</option>
          </select>

          <div className="flex-1" />

          {/* Bulk actions */}
          {selectedReports.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {selectedReports.size} selected
              </span>
              <button
                onClick={() => handleBulkAction("dismiss")}
                className="btn btn-sm"
              >
                Bulk Dismiss
              </button>
              <button
                onClick={() => handleBulkAction("escalate")}
                className="btn btn-sm btn-accent"
              >
                Bulk Escalate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {initialReports.length === 0 ? (
          <div className="card p-8 text-center text-text-secondary">
            No reports found
          </div>
        ) : (
          initialReports.map((report) => (
            <div key={report.id} className="card p-4">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedReports.has(report.id)}
                  onChange={() => toggleSelection(report.id)}
                  className="mt-1"
                />

                {/* Report details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getReasonBadgeColor(report.reason)}`}>
                      {report.reason.replace("_", " ")}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {report.content_type}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-text-primary mb-2">
                    <span className="font-medium">Reported by:</span>{" "}
                    {report.reporter?.display_name || report.reporter?.handle || "Unknown"}
                  </p>

                  {report.details && (
                    <p className="text-sm text-text-secondary mb-3">
                      {report.details}
                    </p>
                  )}

                  {report.resolution && (
                    <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      <span className="font-medium">Resolution:</span> {report.resolution}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {report.status === "pending" || report.status === "reviewing" ? (
                  <div className="flex flex-col gap-2">
                    {report.status === "pending" && (
                      <button
                        onClick={() => handleMarkReviewing(report)}
                        disabled={actioningReport === report.id}
                        className="btn btn-sm"
                      >
                        Start Review
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveContent(report)}
                      disabled={actioningReport === report.id}
                      className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                    >
                      Remove Content
                    </button>
                    <button
                      onClick={() => handleDismiss(report)}
                      disabled={actioningReport === report.id}
                      className="btn btn-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.push(`/admin/moderation?page=${currentPage - 1}` as any)}
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => router.push(`/admin/moderation?page=${currentPage + 1}` as any)}
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
