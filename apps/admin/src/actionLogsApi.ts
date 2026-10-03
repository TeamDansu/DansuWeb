import { fetchAdminLogJson, type LogSort } from "./adminLogsApi.ts";

export type ActionLogSearchField = "actor_username" | "actor_id" | "target_username" | "target_user_id";
export type ActionLogSort = LogSort;
export type ActionLogItem = {
  id: number;
  actor_id: number | null;
  actor_username: string;
  target_user_id: number | null;
  target_username: string;
  action: string;
  created_at: string;
};
export type ActionLogDetail = ActionLogItem & {
  notes: string;
  details: Record<string, unknown>;
};
export type ActionLogPage = {
  items: ActionLogItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export function fetchActionLogs(page: number, sortOption: ActionLogSort,
  search: { field: ActionLogSearchField; value: string } | null, signal: AbortSignal) {
  const [sort, order] = sortOption.split(":");
  const params = new URLSearchParams({ page: String(page), limit: "20", sort, order });
  if (search) params.set(search.field, search.value);
  return fetchAdminLogJson<ActionLogPage>(`/api/v1/admin/action-logs?${params}`, signal, "action");
}

export function fetchActionLogDetail(logId: number, signal: AbortSignal) {
  return fetchAdminLogJson<ActionLogDetail>(`/api/v1/admin/action-logs/${logId}`, signal, "action");
}
