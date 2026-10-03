export type ScoreGrade = "d" | "c" | "b" | "a" | "s" | "s+" | "ss" | "x";

export type ChartLeaderboardEntry = {
  rank: number;
  user_id: number;
  username: string;
  country_code: string | null;
  avatar_url: string | null;
  score_id: number;
  total_score: string;
  grade: ScoreGrade;
  max_combo: number;
  perfect_plus_count: number;
  perfect_count: number;
  great_count: number;
  ok_count: number;
  bad_count: number;
  miss_count: number;
  mods: unknown[];
  achieved_at: string;
  replay_available: boolean;
};

export type ChartLeaderboardPage = {
  chart_id: number;
  items: ChartLeaderboardEntry[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ChartLeaderboardScore = ChartLeaderboardEntry & {
  chart_id: number;
  score_sr: string;
  raw_score: string;
  max_score: string;
  note_count: number;
  average_signed_timing_ms: string;
  unstable_rate: string;
};

export const CHART_LEADERBOARD_PAGE_SIZE = 20;

export function getChartReplayDownloadUrl(
  chartId: number, entry: Pick<ChartLeaderboardEntry, "score_id" | "replay_available">,
): string | null {
  return entry.replay_available
    ? `/api/v1/leaderboards/charts/${chartId}/scores/${entry.score_id}/replay`
    : null;
}

export function supportsChartLeaderboard(status: string, removed: boolean) {
  return !removed && (status === "approved" || status === "ranked");
}

export function formatLeaderboardScore(value: string, decimals = 4) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toLocaleString("en-US", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }) : "—";
}

async function fetchLeaderboardJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", signal });
  if (!response.ok) {
    const body: { detail?: unknown } | null = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail
      : `Unable to load leaderboard (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function fetchChartLeaderboard(chartId: number, page: number, signal: AbortSignal) {
  return fetchLeaderboardJson<ChartLeaderboardPage>(
    `/api/v1/leaderboards/charts/${chartId}?page=${page}&limit=${CHART_LEADERBOARD_PAGE_SIZE}`, signal,
  );
}

export function fetchChartLeaderboardScore(chartId: number, scoreId: number, signal: AbortSignal) {
  return fetchLeaderboardJson<ChartLeaderboardScore>(
    `/api/v1/leaderboards/charts/${chartId}/scores/${scoreId}`, signal,
  );
}
