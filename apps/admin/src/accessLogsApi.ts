import { fetchAdminLogJson, type LogSort } from "./adminLogsApi.ts";

export type AccessLogSort = LogSort;
export type AccessLogSearchField = "username" | "user_id" | "page_path";
export type AccessResult = "granted" | "denied";
export type AccessLogItem = {
  id: number;
  username: string | null;
  page_path: string;
  created_at: string;
};
export type AccessLogDetail = AccessLogItem & {
  user_id: number | null;
  result: AccessResult;
  ip_address: string | null;
  user_agent: string | null;
};
export type AccessLogPage = {
  items: AccessLogItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export function fetchAccessLogs(page: number, sortOption: AccessLogSort,
  search: { field: AccessLogSearchField; value: string } | null,
  result: AccessResult | "", signal: AbortSignal) {
  const [sort, order] = sortOption.split(":");
  const params = new URLSearchParams({ page: String(page), limit: "20", sort, order });
  if (search) params.set(search.field, search.value);
  if (result) params.set("result", result);
  return fetchAdminLogJson<AccessLogPage>(`/api/v1/admin/access-logs?${params}`, signal, "access");
}

export function fetchAccessLogDetail(logId: number, signal: AbortSignal) {
  return fetchAdminLogJson<AccessLogDetail>(`/api/v1/admin/access-logs/${logId}`, signal, "access");
}
