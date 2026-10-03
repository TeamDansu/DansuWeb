import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import Pagination from "./Pagination";
import UserProfile, { type UserProfileData } from "./UserProfile";
import { fetchUserProfile } from "./userApi";
import { formatRelativeTime } from "./relativeTime";
import { getAdminRefreshVersion, type AdminRefreshState } from "./adminRefresh";
import {
  fetchChartLeaderboard, fetchChartLeaderboardScore, formatLeaderboardScore, getChartReplayDownloadUrl,
  type ChartLeaderboardEntry, type ChartLeaderboardPage, type ChartLeaderboardScore,
} from "./chartLeaderboardApi";

const judgementColumns = [
  ["perfect_plus_count", "PERFECT+", "perfect-plus"],
  ["perfect_count", "PERFECT", "perfect"],
  ["great_count", "GREAT", "great"],
  ["ok_count", "OK", "ok"],
  ["bad_count", "BAD", "bad"],
  ["miss_count", "MISS", "miss"],
] as const;

const kstDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function achievedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${kstDate.format(date)} KST`;
}

function Grade({ grade }: Pick<ChartLeaderboardEntry, "grade">) {
  return <span className={`chart-leaderboard__grade admin-user-detail__grade-card--${grade === "s+" ? "s-plus" : grade}`}>
    {grade.toUpperCase()}
  </span>;
}

function ReplayDownload({ chartId, entry }: { chartId: number; entry: ChartLeaderboardEntry }) {
  const url = getChartReplayDownloadUrl(chartId, entry);
  const content = <>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>
    <span>DOWNLOAD REPLAY</span>
  </>;
  return url
    ? <a className="chart-leaderboard__replay admin-button-motion" href={url} download>{content}</a>
    : <button className="chart-leaderboard__replay" type="button" disabled title="Replay unavailable for this score.">{content}</button>;
}

function Player({ entry, large = false }: { entry: ChartLeaderboardEntry; large?: boolean }) {
  const flag = entry.country_code && /^[a-z]{2}$/i.test(entry.country_code) ? <img className="chart-leaderboard__flag"
    src={`https://flagcdn.com/28x21/${entry.country_code.toLowerCase()}.png`} width={20} height={15}
    alt={entry.country_code} onError={event => { event.currentTarget.style.display = "none"; }} /> : null;
  return <div className={`chart-leaderboard__player${large ? " chart-leaderboard__player--large" : ""}`}>
    {!large && flag}
    <span className="chart-leaderboard__avatar" aria-hidden="true">
      {entry.username.charAt(0)}
      {entry.avatar_url && <img key={entry.avatar_url} src={entry.avatar_url} alt="" loading="lazy"
        onError={event => { event.currentTarget.style.display = "none"; }} />}
    </span>
    <span className="chart-leaderboard__player-label">
      <Link className="chart-leaderboard__player-name" to={`/users/${entry.user_id}`} title={entry.username}>{entry.username}</Link>
      {large && flag}
    </span>
  </div>;
}

function ScoreSpotlight({ chartId, entry, refreshVersion, retryVersion, refresh, now }: {
  chartId: number; entry: ChartLeaderboardEntry; refreshVersion: number; retryVersion: number;
  refresh: AdminRefreshState; now: number;
}) {
  const [detail, setDetail] = useState<ChartLeaderboardScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRefreshVersion = getAdminRefreshVersion(refresh, "user-profile", entry.user_id);
  const previousProfileRefresh = useRef({ id: entry.user_id, version: profileRefreshVersion });
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setProfileError(null);
    const isRefresh = previousProfileRefresh.current.id === entry.user_id && previousProfileRefresh.current.version !== profileRefreshVersion;
    previousProfileRefresh.current = { id: entry.user_id, version: profileRefreshVersion };
    const change = refreshRef.current.change;
    if (isRefresh && change && "userId" in change && change.userId === entry.user_id && change.detail) {
      setProfile(change.detail);
      return () => controller.abort();
    }
    async function loadProfile() {
      try {
        const user = await fetchUserProfile(entry.user_id, controller.signal);
        if (!controller.signal.aborted) setProfile(user);
      } catch (cause) {
        if (!controller.signal.aborted) setProfileError(cause instanceof Error ? cause.message : "Unable to load player profile.");
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [entry.user_id, profileRefreshVersion]);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError(null);
    async function load() {
      try {
        const data = await fetchChartLeaderboardScore(chartId, entry.score_id, controller.signal);
        if (!controller.signal.aborted) setDetail(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load score details.");
      }
    }
    void load();
    return () => controller.abort();
  }, [chartId, entry.score_id, refreshVersion, retryVersion]);
  return <article className="chart-leaderboard__spotlight" aria-label="Selected leaderboard score">
    <div className="chart-leaderboard__featured-player">
      <div className="chart-leaderboard__placing"><strong>#{entry.rank}</strong><Grade grade={entry.grade} /></div>
      <div>{profile?.id === entry.user_id ? <UserProfile user={profile} linkToDetail /> : <>
        <Player entry={entry} large />
        <p className="chart-leaderboard__detail-message" role={profileError ? "alert" : "status"}>
          {profileError || "Loading profile…"}
        </p>
      </>}</div>
    </div>
    <div className="chart-leaderboard__score-info">
      <ReplayDownload chartId={chartId} entry={detail ?? entry} />
      {detail && <div className="chart-leaderboard__score-extra">
        <span title={`RAW SCORE ${formatLeaderboardScore(detail.raw_score, 2)} / ${formatLeaderboardScore(detail.max_score, 2)}`}>RAW SCORE {formatLeaderboardScore(detail.raw_score, 2)} / {formatLeaderboardScore(detail.max_score, 2)}</span>
        <span title={`UR ${formatLeaderboardScore(detail.unstable_rate, 2)}`}>UR {formatLeaderboardScore(detail.unstable_rate, 2)}</span>
        <span title={`TIMING ${formatLeaderboardScore(detail.average_signed_timing_ms, 2)} ms`}>TIMING {formatLeaderboardScore(detail.average_signed_timing_ms, 2)} ms</span>
      </div>}
      <dl className="chart-leaderboard__summary">
        <div><dt>SCORE</dt><dd title={formatLeaderboardScore(entry.total_score)}>{formatLeaderboardScore(entry.total_score)}</dd></div>
        <div><dt>MAX COMBO</dt><dd title={`${entry.max_combo.toLocaleString()}x`}>{entry.max_combo.toLocaleString()}x</dd></div>
        <div><dt>SR</dt><dd title={detail ? formatLeaderboardScore(detail.score_sr, 2) : undefined}>{detail ? formatLeaderboardScore(detail.score_sr, 2) : "—"}</dd></div>
      </dl>
      {detail ? <>
        <dl className="chart-leaderboard__judgements">
          {judgementColumns.map(([field, label, tone]) => <div key={field} className={`admin-user-detail__judgement admin-user-detail__judgement--${tone}`}>
            <dt>{label}</dt><dd title={detail[field].toLocaleString()} className={detail[field] === 0 ? "chart-leaderboard__count--zero" : undefined}>{detail[field].toLocaleString()}</dd>
          </div>)}
          <div className="chart-leaderboard__achieved"><dt>ACHIEVED</dt><dd>
            <time dateTime={entry.achieved_at} title={achievedAt(entry.achieved_at)}>
              {formatRelativeTime(entry.achieved_at, now)}
            </time>
          </dd></div>
        </dl>
      </> : <p className="chart-leaderboard__detail-message" role={error ? "alert" : "status"}>{error || "Loading score details…"}</p>}
    </div>
  </article>;
}

export default function ChartLeaderboard({ chartId, chartsetId, available, removed, refresh }: {
  chartId: number; chartsetId: number; available: boolean; removed: boolean; refresh: AdminRefreshState;
}) {
  const refreshVersion = getAdminRefreshVersion(refresh, "chart-leaderboard", chartsetId);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<(ChartLeaderboardPage & { loadedAt: number; refreshVersion: number }) | null>(null);
  const [selectedScoreId, setSelectedScoreId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    // Keep the spotlight mounted while refreshing the same page so unrelated
    // account changes do not refetch the selected player's basic profile.
    setResult(current => current?.chart_id === chartId && current.page === page ? current : null);
    setError(null);
    setLoading(available);
    if (!available) return () => controller.abort();
    async function load() {
      try {
        const data = await fetchChartLeaderboard(chartId, page, controller.signal);
        if (!controller.signal.aborted) {
          setResult({ ...data, loadedAt: Date.now(), refreshVersion });
          setSelectedScoreId(current => data.items.some(item => item.score_id === current) ? current : null);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load leaderboard.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [chartId, page, available, refreshVersion, retryVersion]);
  const current = available && result?.chart_id === chartId && result.page === page ? result : null;
  const focused = current?.items.find(item => item.score_id === selectedScoreId) ?? current?.items[0];
  return <section className="chart-leaderboard" aria-label="Chart leaderboard" aria-busy={loading}>
    {!available ? <p className="chart-leaderboard__message">{removed ? "Leaderboards are unavailable for removed chartsets."
      : "Leaderboards are available for Approved and Ranked charts."}</p>
      : error ? <div className="chart-leaderboard__message" role="alert"><p>{error}</p>
        <button type="button" onClick={() => setRetryVersion(value => value + 1)}>RETRY</button></div>
      : !current ? <p className="chart-leaderboard__message" role="status">Loading leaderboard…</p>
      : !current.items.length ? <p className="chart-leaderboard__message">No scores on this page yet.</p>
      : <>
        {focused && <ScoreSpotlight key={focused.score_id} chartId={chartId} entry={focused}
          refreshVersion={current.refreshVersion} retryVersion={retryVersion} refresh={refresh} now={current.loadedAt} />}
        <div className="chart-leaderboard__table-scroll">
          <table><thead><tr>
            <th scope="col">RANK</th><th scope="col" aria-label="Grade" /><th scope="col">SCORE</th>
            <th className="chart-leaderboard__player-gap" aria-hidden="true" />
            <th scope="col" className="chart-leaderboard__player-heading">PLAYER</th><th scope="col">MAX COMBO</th>
            {judgementColumns.map(([field, label, tone]) => <th key={field} scope="col"
              className={`chart-leaderboard__judgement-cell admin-user-detail__judgement--${tone}`}>{label}</th>)}
            <th scope="col">ACHIEVED</th>
          </tr></thead><tbody>
            {current.items.map(entry => <tr key={entry.score_id}
              className={entry.score_id === focused?.score_id ? "chart-leaderboard__row--selected" : undefined}
              onClick={event => {
                if ((event.target as Element).closest("a, button")) return;
                setSelectedScoreId(entry.score_id);
              }}>
              <td><button className="chart-leaderboard__select" type="button" aria-label={`View score at rank ${entry.rank}`}
                aria-pressed={entry.score_id === focused?.score_id} onClick={() => setSelectedScoreId(entry.score_id)}>#{entry.rank}</button></td>
              <td><Grade grade={entry.grade} /></td><td title={formatLeaderboardScore(entry.total_score)}>{formatLeaderboardScore(entry.total_score)}</td>
              <td className="chart-leaderboard__player-gap" aria-hidden="true" />
              <td><Player entry={entry} /></td><td title={`${entry.max_combo.toLocaleString()}x`}>{entry.max_combo.toLocaleString()}x</td>
              {judgementColumns.map(([field, , tone]) => <td key={field}
                className={`chart-leaderboard__judgement-cell admin-user-detail__judgement--${tone}`}>
                <span title={entry[field].toLocaleString()} className={entry[field] === 0 ? "chart-leaderboard__count--zero" : undefined}>{entry[field].toLocaleString()}</span>
              </td>)}
              <td><time dateTime={entry.achieved_at} title={achievedAt(entry.achieved_at)}>
                {formatRelativeTime(entry.achieved_at, current.loadedAt)}
              </time></td>
            </tr>)}
          </tbody></table>
        </div>
      </>}
    {current && <footer className="chart-leaderboard__footer">
      <Pagination label="Chart leaderboard pages" page={page} totalPages={current.total_pages}
        loading={loading} onPageChange={setPage} />
      <span className="chart-leaderboard__player-total">{current.total.toLocaleString()} PLAYERS</span>
    </footer>}
  </section>;
}
