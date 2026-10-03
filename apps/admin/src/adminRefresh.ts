import type { ChartsetDetail, ChartsetStatus } from "./chartTypes";
import type { UserDetail } from "./userTypes";
import type { UserProfileData } from "./UserProfile";

export type AdminUpdate = {
  kind: "user-account-status" | "user-access";
  userId: number;
  detail?: UserDetail | UserProfileData;
} | {
  kind: "chartset-status" | "chartset-delete" | "chartset-restore";
  chartsetId: number;
  previousStatus?: ChartsetStatus;
  newStatus?: ChartsetStatus;
  detail?: ChartsetDetail;
};

export type AdminRefreshState = {
  version: number;
  versions: Record<string, number>;
  change: AdminUpdate | null;
};

export const initialAdminRefresh: AdminRefreshState = { version: 0, versions: {}, change: null };

export function applyAdminUpdate(current: AdminRefreshState, change: AdminUpdate): AdminRefreshState {
  const version = current.version + 1;
  const keys = ["action-logs"];
  if ("userId" in change) {
    keys.push("user-list", `user-detail:${change.userId}`);
    if (change.kind === "user-account-status") {
      // A ban changes other users' ranks too; an unban may add an unseen player.
      keys.push("user-ranks", "chart-leaderboards", `user-profile:${change.userId}`);
    }
  } else {
    keys.push("chartset-list", `chartset-detail:${change.chartsetId}`, `chart-leaderboard:${change.chartsetId}`);
    const statuses = ["published", "pending", "approved", "ranked"];
    const affectsSr = change.kind !== "chartset-status"
      || !statuses.includes(change.previousStatus ?? "") || !statuses.includes(change.newStatus ?? "")
      || change.previousStatus === "ranked" || change.newStatus === "ranked";
    if (affectsSr) keys.push("user-list", "user-ranks");
  }
  const versions = { ...current.versions };
  for (const key of keys) versions[key] = version;
  return { version, versions, change };
}

export function getAdminRefreshVersion(refresh: AdminRefreshState,
  scope: "user-list" | "chartset-list" | "action-logs" | "user-detail" | "user-profile" | "chartset-detail" | "chart-leaderboard",
  id?: string | number | null): number {
  const specific = refresh.versions[id == null ? scope : `${scope}:${id}`] ?? 0;
  if (scope === "user-detail") return Math.max(specific, refresh.versions["user-ranks"] ?? 0);
  if (scope === "chart-leaderboard") return Math.max(specific, refresh.versions["chart-leaderboards"] ?? 0);
  return specific;
}
