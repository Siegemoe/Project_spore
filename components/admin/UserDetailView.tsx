"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { AdminUser } from "@/lib/admin/auth";
import {
  adminSuspendUser,
  adminUnsuspendUser,
  adminBanUser,
  adminUnbanUser,
  adminResetUserPassword,
  adminDeleteUser,
} from "@/features/admin/user-actions";

interface UserDetailViewProps {
  userDetails: any;
  adminUser: AdminUser;
}

export default function UserDetailView({ userDetails, adminUser }: UserDetailViewProps) {
  const router = useRouter();
  const [actionPending, setActionPending] = useState(false);
  
  const { user, moderation, stats, recent_posts, recent_comments, moderation_history } = userDetails;
  
  const canModerate = ["moderator", "super_admin"].includes(adminUser.role);
  const canDelete = adminUser.role === "super_admin";

  // Action handlers
  const handleSuspend = async () => {
    const reason = prompt("Reason for suspension:");
    if (!reason) return;
    
    const daysStr = prompt("Duration in days:", "7");
    if (!daysStr) return;
    
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1) {
      alert("Invalid duration");
      return;
    }
    
    setActionPending(true);
    try {
      await adminSuspendUser(user.id, reason, days);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleUnsuspend = async () => {
    const reason = prompt("Reason for unsuspension:", "Appeal approved");
    if (!reason) return;
    
    setActionPending(true);
    try {
      await adminUnsuspendUser(user.id, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleBan = async () => {
    const reason = prompt("Reason for permanent ban:");
    if (!reason) return;
    
    if (!confirm("Are you sure you want to PERMANENTLY ban this user?")) return;
    
    setActionPending(true);
    try {
      await adminBanUser(user.id, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleUnban = async () => {
    const reason = prompt("Reason for unban:", "Appeal approved");
    if (!reason) return;
    
    setActionPending(true);
    try {
      await adminUnbanUser(user.id, reason);
      router.refresh();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    
    setActionPending(true);
    try {
      await adminResetUserPassword(user.id, user.email);
      alert("Password reset email sent!");
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = async () => {
    const reason = prompt("Reason for account deletion:");
    if (!reason) return;
    
    if (!confirm("Are you ABSOLUTELY sure? This CANNOT be undone!")) return;
    if (!confirm(`Type DELETE to confirm deletion of ${user.handle || user.email}`)) return;
    
    setActionPending(true);
    try {
      await adminDeleteUser(user.id, reason);
      alert("User deleted");
      router.push("/admin/users" as any);
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
      setActionPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          <Avatar
            src={user.avatar_url}
            alt={user.display_name || user.handle || "User"}
            name={user.display_name || user.handle || "User"}
            size="lg"
          />
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {user.display_name || user.handle || "Unnamed User"}
            </h1>
            {user.handle && (
              <p className="text-text-secondary mb-2">@{user.handle}</p>
            )}
            {user.bio && (
              <p className="text-sm text-text-secondary mb-4">{user.bio}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-text-secondary">Email</div>
                <div className="font-medium text-text-primary">{user.email}</div>
              </div>
              <div>
                <div className="text-text-secondary">Joined</div>
                <div className="font-medium text-text-primary">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Last Sign In</div>
                <div className="font-medium text-text-primary">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
              {user.github_username && (
                <div>
                  <div className="text-text-secondary">GitHub</div>
                  <div className="font-medium text-text-primary">@{user.github_username}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-text-primary">{stats.post_count}</div>
          <div className="text-sm text-text-secondary">Posts</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-text-primary">{stats.comment_count}</div>
          <div className="text-sm text-text-secondary">Comments</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-text-primary">{stats.follower_count}</div>
          <div className="text-sm text-text-secondary">Followers</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-text-primary">{stats.following_count}</div>
          <div className="text-sm text-text-secondary">Following</div>
        </div>
      </div>

      {/* Moderation Status */}
      {moderation && (moderation.is_banned || moderation.is_suspended || moderation.warning_count > 0) && (
        <div className="card p-6 bg-red-50 border-red-200">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Moderation Status</h2>
          <div className="space-y-3">
            {moderation.is_banned && (
              <div className="text-sm">
                <span className="font-medium text-red-800">Status:</span> BANNED
                <p className="text-red-700 mt-1">{moderation.ban_reason}</p>
              </div>
            )}
            {moderation.is_suspended && (
              <div className="text-sm">
                <span className="font-medium text-orange-800">Status:</span> SUSPENDED
                <p className="text-orange-700 mt-1">
                  Until {moderation.suspension_ends_at 
                    ? new Date(moderation.suspension_ends_at).toLocaleString()
                    : "indefinite"}
                </p>
                <p className="text-orange-700">{moderation.suspension_reason}</p>
              </div>
            )}
            {moderation.warning_count > 0 && (
              <div className="text-sm">
                <span className="font-medium text-yellow-800">Warnings:</span> {moderation.warning_count}
                {moderation.last_warning_at && (
                  <span className="text-yellow-700 ml-2">
                    (Last: {new Date(moderation.last_warning_at).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {canModerate && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Admin Actions</h2>
          <div className="flex flex-wrap gap-3">
            {!moderation?.is_suspended ? (
              <button
                onClick={handleSuspend}
                disabled={actionPending}
                className="btn btn-sm bg-orange-600 text-white hover:bg-orange-700"
              >
                Suspend User
              </button>
            ) : (
              <button
                onClick={handleUnsuspend}
                disabled={actionPending}
                className="btn btn-sm"
              >
                Unsuspend User
              </button>
            )}
            
            {!moderation?.is_banned ? (
              <button
                onClick={handleBan}
                disabled={actionPending}
                className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              >
                Ban User
              </button>
            ) : adminUser.role === "super_admin" && (
              <button
                onClick={handleUnban}
                disabled={actionPending}
                className="btn btn-sm"
              >
                Unban User
              </button>
            )}
            
            <button
              onClick={handleResetPassword}
              disabled={actionPending}
              className="btn btn-sm"
            >
              Reset Password
            </button>
            
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={actionPending}
                className="btn btn-sm bg-red-800 text-white hover:bg-red-900"
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Posts</h2>
          {recent_posts.length === 0 ? (
            <p className="text-sm text-text-secondary">No posts yet</p>
          ) : (
            <ul className="space-y-3">
              {recent_posts.map((post: any) => (
                <li key={post.id} className="text-sm">
                  <p className="text-text-primary line-clamp-2">{post.caption || "(No caption)"}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Comments */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Comments</h2>
          {recent_comments.length === 0 ? (
            <p className="text-sm text-text-secondary">No comments yet</p>
          ) : (
            <ul className="space-y-3">
              {recent_comments.map((comment: any) => (
                <li key={comment.id} className="text-sm">
                  <p className="text-text-primary line-clamp-2">{comment.body}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Moderation History */}
      {moderation_history.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Moderation History</h2>
          <div className="space-y-3">
            {moderation_history.map((action: any) => (
              <div key={action.id} className="border-l-4 border-border-subtle pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-text-primary">
                    {action.action_type.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-xs text-text-secondary">
                    by {action.admin?.user?.display_name || action.admin?.user?.handle || "Admin"}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{action.reason}</p>
                {action.duration_days && (
                  <p className="text-xs text-text-secondary mt-1">
                    Duration: {action.duration_days} days
                  </p>
                )}
                <p className="text-xs text-text-secondary mt-1">
                  {new Date(action.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
