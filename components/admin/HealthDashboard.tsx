"use client";

import { HealthMetrics, ComponentHealth } from "@/features/health/actions";

interface APIPerformanceMetric {
  endpoint: string;
  total_requests: number;
  avg_response_time?: number;
  p95_response_time?: number;
  error_rate?: number;
}

interface DatabaseStats {
  users_count: number;
  posts_count: number;
  comments_count: number;
  follows_count: number;
}

interface HealthDashboardProps {
  metrics: HealthMetrics;
  systemHealth: ComponentHealth[];
  apiPerformance: APIPerformanceMetric[];
  databaseStats: DatabaseStats;
}

export default function HealthDashboard({
  metrics,
  systemHealth,
  apiPerformance,
  databaseStats,
}: HealthDashboardProps) {
  
  const getHealthColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "bg-green-500",
      degraded: "bg-yellow-500",
      down: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getHealthTextColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "text-green-700",
      degraded: "text-yellow-700",
      down: "text-red-700",
    };
    return colors[status] || "text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Active Users Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Active Users</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Last 5 Minutes</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.active_users_5min}
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Last 15 Minutes</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.active_users_15min}
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Last Hour</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.active_users_1hr}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Avg Response Time</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.avg_response_time}ms
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Error Rate</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.error_rate.toFixed(2)}%
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Posts (24h)</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.total_posts_24h}
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-text-secondary mb-1">Comments (24h)</div>
            <div className="text-3xl font-bold text-text-primary">
              {metrics.total_comments_24h}
            </div>
          </div>
        </div>
      </div>

      {/* System Component Health */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">System Components</h2>
        {systemHealth.length === 0 ? (
          <p className="text-sm text-text-secondary">No health checks recorded yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth.map((health: ComponentHealth) => (
              <div key={health.component} className="flex items-center gap-3 p-4 bg-[rgb(var(--surface-muted))] rounded">
                <div className={`h-3 w-3 rounded-full ${getHealthColor(health.status)}`}></div>
                <div className="flex-1">
                  <div className="font-medium text-text-primary capitalize">
                    {health.component}
                  </div>
                  <div className={`text-xs ${getHealthTextColor(health.status)} capitalize`}>
                    {health.status}
                  </div>
                </div>
                <div className="text-xs text-text-secondary">
                  {new Date(health.last_check).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Performance */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">API Endpoint Performance (Last Hour)</h2>
        {apiPerformance.length === 0 ? (
          <p className="text-sm text-text-secondary">No API metrics recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Endpoint</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Requests</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Avg (ms)</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">P95 (ms)</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Error %</th>
                </tr>
              </thead>
              <tbody>
                {apiPerformance.map((perf) => (
                  <tr key={perf.endpoint} className="border-b border-border-subtle">
                    <td className="py-2 px-3 font-mono text-xs">{perf.endpoint}</td>
                    <td className="text-right py-2 px-3">{perf.total_requests}</td>
                    <td className="text-right py-2 px-3">
                      {Math.round(perf.avg_response_time ?? 0)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {Math.round(perf.p95_response_time ?? 0)}
                    </td>
                    <td className="text-right py-2 px-3">
                      <span className={(perf.error_rate ?? 0) > 5 ? "text-red-600 font-medium" : ""}>
                        {(perf.error_rate ?? 0).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Database Statistics */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Database Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-text-secondary mb-1">Users</div>
            <div className="text-2xl font-bold text-text-primary">
              {databaseStats.users_count.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Posts</div>
            <div className="text-2xl font-bold text-text-primary">
              {databaseStats.posts_count.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Comments</div>
            <div className="text-2xl font-bold text-text-primary">
              {databaseStats.comments_count.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-text-secondary mb-1">Follows</div>
            <div className="text-2xl font-bold text-text-primary">
              {databaseStats.follows_count.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="card p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="font-semibold text-green-800">Platform Operational</h3>
            <p className="text-sm text-green-700 mt-1">
              All systems are running normally. Monitoring {metrics.active_users_5min} active users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
