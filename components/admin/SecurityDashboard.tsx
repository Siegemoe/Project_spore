"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveSecurityEvent,
  blockIP,
  unblockIP,
} from "@/features/security/actions";

interface SecurityDashboardProps {
  initialEvents: any[];
  totalEvents: number;
  highRiskAlerts: any[];
  blockedIPs: any[];
  currentPage: number;
  pageSize: number;
  filters: {
    severity?: string;
    event_type?: string;
    resolved?: boolean;
  };
}

export default function SecurityDashboard({
  initialEvents,
  totalEvents,
  highRiskAlerts,
  blockedIPs,
  currentPage,
  pageSize,
  filters,
}: SecurityDashboardProps) {
  const router = useRouter();
  const [actioningEvent, setActioningEvent] = useState<string | null>(null);
  
  const totalPages = Math.ceil(totalEvents / pageSize);

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (value) params.set(key, value);
    if (filters.severity && key !== "severity") params.set("severity", filters.severity);
    if (filters.event_type && key !== "type") params.set("type", filters.event_type);
    if (filters.resolved !== undefined && key !== "resolved") params.set("resolved", String(filters.resolved));
    router.push(`/admin/security?${params.toString()}` as any);
  };

  // Action handlers
  const handleResolve = async (event: any) => {
    const notes = prompt("Resolution notes:", "Investigated and resolved");
    if (!notes) return;
    
    setActioningEvent(event.id);
    try {
      await resolveSecurityEvent(event.id, notes);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActioningEvent(null);
    }
  };

  const handleBlockIP = async (ipAddress: string) => {
    const reason = prompt("Reason for blocking:");
    if (!reason) return;
    
    const durationStr = prompt("Block duration in hours (leave empty for permanent):", "24");
    const durationHours = durationStr ? parseInt(durationStr) : undefined;
    
    try {
      await blockIP(ipAddress, reason, durationHours);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  const handleUnblockIP = async (ipAddress: string) => {
    const reason = prompt("Reason for unblocking:", "False positive");
    if (!reason) return;
    
    try {
      await unblockIP(ipAddress, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[severity] || colors.low;
  };

  const getEventTypeIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      failed_login: "🔒",
      rate_limit_exceeded: "⏱️",
      suspicious_activity: "🚨",
      csrf_failure: "🛡️",
      invalid_token: "🔑",
      account_takeover_attempt: "⚠️",
      mass_action_detected: "📊",
      geographic_anomaly: "🌍",
      bot_detected: "🤖",
      malicious_upload: "📁",
      sql_injection_attempt: "💉",
      xss_attempt: "⚡",
    };
    return icons[eventType] || "🔔";
  };

  return (
    <div className="space-y-6">
      {/* High Risk Alerts */}
      {highRiskAlerts.length > 0 && (
        <div className="card p-6 bg-red-50 border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-4">
            🚨 High Priority Alerts ({highRiskAlerts.length})
          </h2>
          <div className="space-y-2">
            {highRiskAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-white p-3 rounded border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getEventTypeIcon(alert.event_type)}</span>
                  <span className="font-medium text-sm">
                    {alert.event_type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-text-secondary ml-auto">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                {alert.ip_address && (
                  <p className="text-xs text-text-secondary">IP: {alert.ip_address}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      {blockedIPs.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Blocked IP Addresses ({blockedIPs.length})
          </h2>
          <div className="space-y-2">
            {blockedIPs.map((blocked: any) => (
              <div key={blocked.id} className="flex items-center justify-between p-3 bg-[rgb(var(--surface-muted))] rounded">
                <div>
                  <span className="font-mono text-sm font-medium">{blocked.ip_address}</span>
                  <p className="text-xs text-text-secondary mt-1">{blocked.reason}</p>
                </div>
                <button
                  onClick={() => handleUnblockIP(blocked.ip_address)}
                  className="btn btn-sm"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.severity || ""}
            onChange={(e) => handleFilterChange("severity", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filters.event_type || ""}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Event Types</option>
            <option value="failed_login">Failed Login</option>
            <option value="rate_limit_exceeded">Rate Limit</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="bot_detected">Bot Detected</option>
          </select>

          <select
            value={filters.resolved === undefined ? "" : String(filters.resolved)}
            onChange={(e) => handleFilterChange("resolved", e.target.value)}
            className="border border-border-subtle rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {initialEvents.length === 0 ? (
          <div className="card p-8 text-center text-text-secondary">
            No security events found
          </div>
        ) : (
          initialEvents.map((event) => (
            <div key={event.id} className="card p-4">
              <div className="flex items-start gap-4">
                <span className="text-2xl">{getEventTypeIcon(event.event_type)}</span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-medium text-text-primary">
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                    {event.resolved && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                    )}
                    <span className="text-xs text-text-secondary">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-text-secondary space-y-1">
                    {event.user && (
                      <p>User: {event.user.display_name || event.user.handle || event.user.email}</p>
                    )}
                    {event.ip_address && (
                      <p className="flex items-center gap-2">
                        IP: <span className="font-mono">{event.ip_address}</span>
                        {!event.resolved && (
                          <button
                            onClick={() => handleBlockIP(event.ip_address)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Block IP
                          </button>
                        )}
                      </p>
                    )}
                    {event.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer">Details</summary>
                        <pre className="mt-1 p-2 bg-[rgb(var(--surface-muted))] rounded overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  {event.resolution_notes && (
                    <p className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                      Resolution: {event.resolution_notes}
                    </p>
                  )}
                </div>

                {!event.resolved && (
                  <button
                    onClick={() => handleResolve(event)}
                    disabled={actioningEvent === event.id}
                    className="btn btn-sm"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.push(`/admin/security?page=${currentPage - 1}` as any)}
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => router.push(`/admin/security?page=${currentPage + 1}` as any)}
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
