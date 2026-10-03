import { readPermissionError } from "./adminPermissions";

export type LogSort = "created_at:desc" | "created_at:asc" | "id:desc" | "id:asc";

export async function fetchAdminLogJson<T>(url: string, signal: AbortSignal, kind: "action" | "access"): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", signal });
  if (!response.ok) {
    const fallback = response.status === 401 ? "Your session expired. Sign in again."
      : `Unable to load ${kind} logs (${response.status}).`;
    throw await readPermissionError(response, fallback, 16);
  }
  return response.json() as Promise<T>;
}

const kstDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function formatLogTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${kstDateTime.format(date)} KST`;
}
