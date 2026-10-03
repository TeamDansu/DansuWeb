import type { ChartsetDetail } from "./chartTypes";
import { readPermissionError } from "./adminPermissions.ts";

export async function fetchChartsetDetail(chartsetId: string | number, signal: AbortSignal): Promise<ChartsetDetail> {
  const response = await fetch(`/api/v1/admin/chartsets/${chartsetId}`, {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    const fallback = response.status === 404 ? "Chartset not found."
      : response.status === 401 ? "Your session expired. Sign in again."
      : response.status === 403 ? "You do not have permission to view this chartset."
      : `Unable to load chartset (${response.status}).`;
    throw await readPermissionError(response, fallback, 4);
  }
  return response.json() as Promise<ChartsetDetail>;
}
