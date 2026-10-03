import { useEffect, useRef, useState, type ReactNode } from "react";
import { useOutletContext, useParams } from "react-router";
import { GroupTags, PrivilegeTags, formatPermissionError } from "../Tags";
import { PermissionError } from "../adminPermissions";
import type { AdminPageContext } from "../adminContext";
import { getAdminRefreshVersion } from "../adminRefresh";
import SteamProfileLink from "../SteamProfileLink";
import type { UserDetail, UserStats } from "../userTypes";
import { fetchUserDetail } from "../userApi";
import AdminButton from "../AdminButton";

const overviewFields: { label: string; key: keyof UserStats }[] = [
  { label: "SR TOTAL", key: "sr_total" },
  { label: "RANKED SCORE TOTAL", key: "ranked_score_total" },
  { label: "TOTAL SCORE", key: "total_score" },
  { label: "OVERALL ACCURACY", key: "overall_accuracy" },
  { label: "PLAY COUNT", key: "play_count" },
  { label: "PLAY TIME (SECONDS)", key: "play_time_seconds" },
];

type JudgementColor = "miss" | "bad" | "ok" | "great" | "perfect" | "perfect-plus";

const hitFields: { label: string; key: keyof UserStats; color?: JudgementColor }[] = [
  { label: "MAX COMBO", key: "max_combo" },
  { label: "TOTAL HITS", key: "total_hits" },
  { label: "PERFECT+", key: "total_perfect_plus", color: "perfect-plus" },
  { label: "PERFECT", key: "total_perfect", color: "perfect" },
  { label: "GREAT", key: "total_great", color: "great" },
  { label: "OK", key: "total_ok", color: "ok" },
  { label: "BAD", key: "total_bad", color: "bad" },
  { label: "MISS", key: "total_miss", color: "miss" },
];

const gradeFields: { label: string; key: keyof UserStats; tone: string }[] = [
  { label: "X", key: "count_grade_x", tone: "x" },
  { label: "SS", key: "count_grade_ss", tone: "ss" },
  { label: "S+", key: "count_grade_s_plus", tone: "s-plus" },
  { label: "S", key: "count_grade_s", tone: "s" },
  { label: "A", key: "count_grade_a", tone: "a" },
  { label: "B", key: "count_grade_b", tone: "b" },
  { label: "C", key: "count_grade_c", tone: "c" },
  { label: "D", key: "count_grade_d", tone: "d" },
];

function display(value: string | number | null): string {
  return value === null || value === "" ? "—" : String(value);
}

const kstDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${kstDateTime.format(date)} KST`;
}

export default function UserDetailPage() {
  const { userId = "" } = useParams();
  const { refresh, selectActionUser, updateActionUser } = useOutletContext<AdminPageContext>();
  const refreshVersion = getAdminRefreshVersion(refresh, "user-detail", userId);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const previousRefresh = useRef({ id: userId, version: refreshVersion });
  const initialSelectionPending = useRef(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialSelectionPending.current = true;
    selectActionUser(null);
  }, [userId, selectActionUser]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setUser(current => String(current?.id) === userId ? current : null);
    setError(null);

    const isRefresh = previousRefresh.current.id === userId && previousRefresh.current.version !== refreshVersion;
    previousRefresh.current = { id: userId, version: refreshVersion };
    const change = refreshRef.current.change;
    const updatedUserDetail = change && "userId" in change && change.detail && "stats" in change.detail ? change.detail : null;
    function applyUser(data: UserDetail) {
      setUser(data);
      if (initialSelectionPending.current) {
        selectActionUser(data);
        initialSelectionPending.current = false;
      } else {
        updateActionUser(data);
      }
    }
    // Share this action's fresh response, but still fetch on later page visits.
    if (isRefresh && updatedUserDetail && String(updatedUserDetail.id) === userId) {
      applyUser(updatedUserDetail);
      setLoading(false);
      return () => controller.abort();
    }

    async function loadUser() {
      try {
        const data = await fetchUserDetail(userId, controller.signal);
        if (!controller.signal.aborted) {
          applyUser(data);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (cause instanceof PermissionError) setUser(null);
          setError(formatPermissionError(cause, "Unable to load user."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadUser();
    return () => controller.abort();
  }, [userId, refreshVersion, selectActionUser, updateActionUser]);

  const hasCurrentUser = user !== null && String(user.id) === userId;
  const globalRank = user?.rank;
  const countryRank = user?.country_rank;

  return (
    <section className="admin-user-detail" aria-busy={loading}>
      <AdminButton className="admin-user-detail__back" size="large" to="/users" aria-label="Back to users" icon={
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M17 6 4 20l13 14V25h18V15H17V6Z" />
        </svg>
      }>
        <span>BACK</span>
      </AdminButton>
      {error && hasCurrentUser && (
        <div className="admin-user-detail__message" role="alert">{error}</div>
      )}
      {loading && !hasCurrentUser ? (
        <p className="admin-user-detail__message">Loading user...</p>
      ) : error && !hasCurrentUser ? (
        <div className="admin-user-detail__message" role="alert">{error}</div>
      ) : hasCurrentUser && user ? (
        <>
          <header className="admin-user-detail__header">
            <span className="admin-user-detail__avatar" aria-hidden="true">
              {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username.charAt(0)}
            </span>
            <div className="admin-user-detail__profile">
              <div className="admin-user-detail__name-row">
                <h2>{user.username}</h2>
              </div>
              <p className="admin-user-detail__steam-profile">
                <SteamProfileLink name={user.steam_persona_name} profileUrl={user.steam_profile_url} />
              </p>
              <p className="admin-user-detail__country">
                {user.country_code && /^[a-z]{2}$/i.test(user.country_code) && (
                  <img
                    key={user.country_code}
                    src={`https://flagcdn.com/28x21/${user.country_code.toLowerCase()}.png`}
                    srcSet={`https://flagcdn.com/56x42/${user.country_code.toLowerCase()}.png 2x`}
                    width={28}
                    height={21}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(event) => { event.currentTarget.hidden = true; }}
                  />
                )}
                {display(user.country_code)}
                <span className={`admin-users__status admin-users__status--${user.account_status}`}>
                  {user.account_status.toUpperCase()}
                </span>
              </p>
            </div>
            <dl className="admin-user-detail__ranks" aria-label="SR rankings">
              <div>
                <dt>GLOBAL RANK</dt>
                <dd>{globalRank == null ? "—" : `#${globalRank}`}</dd>
              </div>
              <div>
                <dt>COUNTRY RANK</dt>
                <dd>{countryRank == null ? "—" : `#${countryRank}`}</dd>
              </div>
            </dl>
            <div className="admin-user-detail__access">
              <section>
                <h3>GROUPS</h3>
                <GroupTags flags={user.groups} />
              </section>
              <section>
                <h3>PRIVILEGES</h3>
                <PrivilegeTags flags={user.privileges} />
              </section>
            </div>
          </header>

          <div className="admin-user-detail__sections">
            <section className="admin-user-detail__section">
              <h3>ACCOUNT</h3>
              <div className="admin-user-detail__account-groups">
                <section className="admin-user-detail__account-group">
                  <dl>
                    <dt>USER ID</dt><dd>{user.id}</dd>
                    <dt>USERNAME SLUG</dt><dd>{user.username_slug}</dd>
                    <dt>CREATED</dt><dd>{formatDateTime(user.created_at)}</dd>
                    <dt>UPDATED</dt><dd>{formatDateTime(user.updated_at)}</dd>
                    <dt>LAST LOGIN</dt><dd>{formatDateTime(user.last_login_at)}</dd>
                    <dt>LAST SEEN</dt><dd>{formatDateTime(user.last_seen_at)}</dd>
                  </dl>
                </section>
                <section className="admin-user-detail__account-group">
                  <h4 className="admin-user-detail__bio-label">BIO</h4>
                  <p className="admin-user-detail__bio">{display(user.bio)}</p>
                </section>
              </div>
            </section>
            <section className="admin-user-detail__section">
              <h3>STATISTICS</h3>
              {user.stats ? (
                <div className="admin-user-detail__stats-groups">
                  <section className="admin-user-detail__stats-group admin-user-detail__stats-group--overview">
                    <dl className="admin-user-detail__overview-grid">
                      {overviewFields.map(({ label, key }) => (
                        <div className="admin-user-detail__overview-card" key={key}>
                          <dt>{label}</dt><dd>{user.stats?.[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <hr className="admin-user-detail__stats-divider" />
                  <section className="admin-user-detail__stats-group">
                    <dl>
                      {hitFields.map(({ label, key, color }) => (
                        <div
                          className={`admin-user-detail__stat${color ? ` admin-user-detail__judgement admin-user-detail__judgement--${color}` : ""}`}
                          key={key}
                        >
                          <dt>{label}</dt><dd>{user.stats?.[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <section className="admin-user-detail__stats-group admin-user-detail__stats-group--grades">
                    <dl className="admin-user-detail__grade-grid">
                      {gradeFields.map(({ label, key, tone }) => (
                        <div className={`admin-user-detail__grade-card admin-user-detail__grade-card--${tone}`} key={key}>
                          <dt>{label}</dt><dd>{user.stats?.[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              ) : <p className="admin-user-detail__message">No statistics yet.</p>}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
