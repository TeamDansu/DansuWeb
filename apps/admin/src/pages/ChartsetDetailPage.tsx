import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router";
import type { AdminPageContext } from "../adminContext";
import { getAdminRefreshVersion } from "../adminRefresh";
import type { ChartsetDetail } from "../chartTypes";
import DifficultyStar from "../DifficultyStar";
import { getDifficultyAppearance } from "../difficultyColors";
import UserProfile, { type UserProfileData } from "../UserProfile";
import { fetchUserProfile } from "../userApi";
import { fetchChartsetDetail } from "../chartsetApi";
import ChartLeaderboard from "../ChartLeaderboard";
import { supportsChartLeaderboard } from "../chartLeaderboardApi";
import { toChartsetSummary } from "../chartsetSummary";
import AdminButton from "../AdminButton";
import { ChartsetStatusTag, ChartsetOriginTag, formatPermissionError } from "../Tags";

const kstDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function dateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${kstDateTime.format(date)} KST`;
}

function duration(milliseconds: number | null) {
  if (milliseconds === null) return "—";
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function decimal(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(2))) : "—";
}

function InfoList({ items }: { items: [string, string | number | null][] }) {
  return <dl className="admin-chartset-detail__info">
    {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null || value === "" ? "—" : value}</dd></div>)}
  </dl>;
}

export default function ChartsetDetailPage() {
  const { chartsetId = "" } = useParams();
  const { refresh, selectActionChartset, updateActionChartset } = useOutletContext<AdminPageContext>();
  const refreshVersion = getAdminRefreshVersion(refresh, "chartset-detail", chartsetId);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const previousRefresh = useRef({ id: chartsetId, version: refreshVersion });
  const initialSelectionPending = useRef(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [chartset, setChartset] = useState<ChartsetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReactNode>(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserProfileData | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  useEffect(() => {
    initialSelectionPending.current = true;
    selectActionChartset(null);
  }, [chartsetId, selectActionChartset]);

  useEffect(() => {
    const controller = new AbortController();
    setChartset(current => String(current?.id) === chartsetId ? current : null);
    setLoading(true);
    setError(null);
    const isRefresh = previousRefresh.current.id === chartsetId && previousRefresh.current.version !== refreshVersion;
    previousRefresh.current = { id: chartsetId, version: refreshVersion };
    const change = refreshRef.current.change;
    const updatedChartsetDetail = change && "chartsetId" in change ? change.detail : null;
    function applyChartset(data: ChartsetDetail) {
      setChartset(data);
      const target = toChartsetSummary(data);
      if (initialSelectionPending.current) {
        selectActionChartset(target);
        initialSelectionPending.current = false;
      } else {
        updateActionChartset(target);
      }
    }
    // Reuse only this action's fresh response, not data from an earlier page visit.
    if (isRefresh && updatedChartsetDetail && String(updatedChartsetDetail.id) === chartsetId) {
      applyChartset(updatedChartsetDetail);
      setLoading(false);
      return () => controller.abort();
    }
    async function load() {
      try {
        const data = await fetchChartsetDetail(chartsetId, controller.signal);
        if (!controller.signal.aborted) {
          applyChartset(data);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(formatPermissionError(cause, "Unable to load chartset."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [chartsetId, refreshVersion, selectActionChartset, updateActionChartset]);

  const current = chartset && String(chartset.id) === chartsetId ? chartset : null;
  const ownerId = current?.owner_id;
  const ownerRefreshVersion = getAdminRefreshVersion(refresh, "user-profile", ownerId);
  const previousOwnerRefresh = useRef({ id: ownerId, version: ownerRefreshVersion });
  useEffect(() => {
    const controller = new AbortController();
    setOwner(profile => profile?.id === ownerId ? profile : null);
    setOwnerError(null);
    const isRefresh = previousOwnerRefresh.current.id === ownerId && previousOwnerRefresh.current.version !== ownerRefreshVersion;
    previousOwnerRefresh.current = { id: ownerId, version: ownerRefreshVersion };
    if (ownerId == null) return;
    const change = refreshRef.current.change;
    if (isRefresh && change && "userId" in change && change.userId === ownerId && change.detail) {
      setOwner(change.detail);
      return () => controller.abort();
    }
    const targetId = ownerId;
    async function loadOwner() {
      try {
        const profile = await fetchUserProfile(targetId, controller.signal);
        if (!controller.signal.aborted) setOwner(profile);
      } catch (cause) {
        if (!controller.signal.aborted) setOwnerError(cause instanceof Error ? cause.message : "Unable to load uploader profile.");
      }
    }
    void loadOwner();
    return () => controller.abort();
  }, [ownerId, ownerRefreshVersion]);
  const difficulties = useMemo(() => current?.charts.map(chart => ({
    chart, appearance: getDifficultyAppearance(chart.rating),
  })) ?? [], [current]);
  const selected = difficulties.find(({ chart }) => String(chart.id) === searchParams.get("chart")) ?? difficulties[0];
  const chart = selected?.chart;
  const creatorName = chart?.creator_display?.trim() || "Unknown";
  const uploader = owner?.id === ownerId ? owner : null;
  const coverUrl = current && !current.is_removed ? `/res/chartsets/${current.id}/cover.webp` : null;
  const showCover = coverUrl !== null && failedCoverUrl !== coverUrl;

  function selectChart(id: number) {
    setSearchParams(params => {
      const next = new URLSearchParams(params);
      next.set("chart", String(id));
      return next;
    }, { replace: true });
  }

  return <section className="admin-chartset-detail" aria-busy={loading}>
    <AdminButton className="admin-user-detail__back" size="large" to="/chartsets" aria-label="Back to chartsets" icon={
      <svg viewBox="0 0 40 40" fill="none"><path d="M17 6 4 20l13 14V25h18V15H17V6Z" /></svg>
    }>
      <span>BACK</span>
    </AdminButton>
    {error && <div className="admin-user-detail__message" role="alert">{error}</div>}
    {loading && !current ? <p className="admin-user-detail__message">Loading chartset...</p> : current && <>
      <header className="admin-chartset-detail__hero">
        <div className="admin-chartset-detail__artwork">
          {showCover && <img className="admin-chartset-detail__backdrop" src={coverUrl} alt="" decoding="async"
            onError={() => setFailedCoverUrl(coverUrl)} />}
          <div className="admin-chartset-detail__hero-content">
            <div className="admin-chartset-detail__top-row">
              <div className="admin-chartset-detail__difficulties" role="group" aria-label="Select chart difficulty">
                {difficulties.map(({ chart: item, appearance }) => <button key={item.id} type="button"
                  aria-label={`${item.difficulty_name} · ${appearance.rating.toFixed(2)}`}
                  aria-pressed={item.id === chart?.id} title={`${item.difficulty_name} · ${appearance.rating.toFixed(2)}`}
                  onClick={() => selectChart(item.id)}>
                  <DifficultyStar color={appearance.color} />
                </button>)}
              </div>
            </div>
            <div className="admin-chartset-detail__identity">
              {selected && <p className="admin-chartset-detail__difficulty">
                <span className="difficulty-preview__badge" style={{backgroundColor:selected.appearance.color,color:selected.appearance.textColor}}>
                  <span><DifficultyStar color={selected.appearance.textColor} /></span>{selected.appearance.rating.toFixed(2)}
                </span>
                <strong>{chart?.difficulty_name}</strong>
              </p>}
              <h2>{chart?.title || "Untitled chartset"}</h2>
              <p className="admin-chartset-detail__artist">{chart?.artist || "Unknown artist"}</p>
              <p className="admin-chartset-detail__owner">Uploaded by</p>
              {uploader ? <UserProfile user={uploader} linkToDetail />
                : <p className="admin-chartset-detail__owner">{ownerError || (ownerId == null ? "Unknown uploader" : "Loading profile…")}</p>}
            </div>
          </div>
        </div>
        <aside className="admin-chartset-detail__panel" aria-label="Chart information panel">
          <div className="admin-chartset-detail__panel-top">
            {chart && <dl className="admin-chartset-detail__metrics" aria-label="Selected chart statistics">
              {([
                ["DURATION", duration(chart.play_time_ms)],
                ["BPM", Number(chart.min_bpm) === Number(chart.max_bpm) ? decimal(chart.min_bpm) : `${decimal(chart.min_bpm)} – ${decimal(chart.max_bpm)}`],
                ["NOTES", chart.note_count.toLocaleString()],
                ["MAX COMBO", chart.max_combo.toLocaleString()],
                ["REVISION", chart.chart_revision],
                ["RATING VERSION", chart.rating_version],
              ] as const).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>}
            <div className="admin-chartset-detail__tags">
              <ChartsetOriginTag origin={current.origin} className="admin-chartset-card__origin" />
              {current.is_removed && <span className="admin-chartset-card__removed">REMOVED</span>}
              <ChartsetStatusTag status={current.status} className="admin-chartset-card__status" />
            </div>
          </div>
          <p className="admin-chartset-detail__owner">Mapped by <strong>{creatorName}</strong></p>
          <dl className="admin-chartset-detail__counts" aria-label="Chartset activity">
            <div><dt title="Plays">
              <svg viewBox="0 0 24 24" role="img" aria-label="Plays"><path d="M8 5 19 12 8 19Z" /></svg>
            </dt><dd>{current.play_count.toLocaleString()}</dd></div>
            <div><dt title="Loves">
              <svg viewBox="0 0 24 24" role="img" aria-label="Loves"><path d="M12 20 3.8 12A5.1 5.1 0 0 1 12 6a5.1 5.1 0 0 1 8.2 6Z" /></svg>
            </dt><dd>{current.loved_count.toLocaleString()}</dd></div>
            <div><dt title="Downloads">
              <svg viewBox="0 0 24 24" role="img" aria-label="Downloads"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>
            </dt><dd>{current.download_count.toLocaleString()}</dd></div>
          </dl>
        </aside>
      </header>
      {chart && <ChartLeaderboard key={chart.id} chartId={chart.id}
        available={supportsChartLeaderboard(current.status, current.is_removed)}
        removed={current.is_removed} chartsetId={current.id} refresh={refresh} />}
      {!chart ? <p className="admin-user-detail__message">No charts in this chartset.</p> : <section className="admin-chartset-detail__section" aria-label="Selected chart information">
        <h3>CHART INFORMATION</h3>
        <InfoList items={[
          ["CHART ID", chart.id], ["CHART UUID", chart.chart_uuid], ["SOURCE", chart.source], ["TAGS", chart.tags],
          ["FORMAT VERSION", chart.format_version], ["PREVIEW START", duration(chart.preview_time_ms)],
          ["CREATED", dateTime(chart.created_at)], ["UPDATED", dateTime(chart.updated_at)],
          ["CHART FILE", chart.relative_chart_path], ["AUDIO FILE", chart.relative_audio_path],
          ["COVER FILE", chart.relative_cover_art_path], ["SKIN FILE", chart.relative_skin_path], ["SHA-256", chart.checksum_sha256],
        ]} />
      </section>}
      <section className="admin-chartset-detail__section" aria-label="Chartset information">
        <h3>CHARTSET INFORMATION</h3>
        <InfoList items={[
          ["CHARTSET ID", current.id], ["CHARTSET UUID", current.chartset_uuid], ["GENRE", current.genre.toUpperCase()],
          ["LANGUAGE", current.language.toUpperCase()], ["NSFL", current.is_nsfl ? "YES" : "NO"],
          ["PACKAGE SIZE", current.package_size_bytes === null ? null : `${(current.package_size_bytes / 1024 / 1024).toFixed(2)} MB`],
          ["DLC ID", current.dlc_id], ["DLC TRACK", current.dlc_track_number], ["VALIDATOR VERSION", current.validator_version],
          ["CREATED", dateTime(current.created_at)], ["UPDATED", dateTime(current.updated_at)],
          ["PUBLISHED", dateTime(current.published_at)], ["RANKED", dateTime(current.ranked_at)],
          ["VALIDATED", dateTime(current.last_validated_at)],
        ]} />
      </section>
    </>}
  </section>;
}
