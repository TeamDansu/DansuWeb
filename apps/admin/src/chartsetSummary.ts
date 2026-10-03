import type { ChartsetDetail, ChartsetSummary } from "./chartTypes";

export function toChartsetSummary(chartset: ChartsetDetail): ChartsetSummary {
  // The list uses the first chart by relative path, not the easiest difficulty.
  const firstChart = [...chartset.charts].sort((left, right) => {
    if (left.relative_chart_path < right.relative_chart_path) return -1;
    if (left.relative_chart_path > right.relative_chart_path) return 1;
    return left.id - right.id;
  })[0];

  return {
    id: chartset.id,
    title: firstChart?.title ?? null,
    artist: firstChart?.artist ?? null,
    owner_id: chartset.owner_id,
    owner_username: chartset.owner_username,
    origin: chartset.origin,
    status: chartset.status,
    is_removed: chartset.is_removed,
    created_at: chartset.created_at,
    last_validated_at: chartset.last_validated_at,
    preview_cover_url: `/res/chartsets/${chartset.id}/cover.webp`,
    charts: chartset.charts.map(({ id, difficulty_name, rating }) => ({ id, difficulty_name, rating }))
      .sort((left, right) => Number(left.rating) - Number(right.rating) || left.id - right.id),
  };
}
