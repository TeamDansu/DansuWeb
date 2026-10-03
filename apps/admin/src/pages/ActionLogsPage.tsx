import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router";
import type { AdminPageContext } from "../adminContext";
import { getAdminRefreshVersion } from "../adminRefresh";
import Pagination from "../Pagination";
import { ActionLogTag, ChartsetStatusTransition, formatPermissionError } from "../Tags";
import { formatLogTime } from "../adminLogsApi";
import { fetchActionLogs, fetchActionLogDetail, type ActionLogPage, type ActionLogDetail,
  type ActionLogSearchField, type ActionLogSort } from "../actionLogsApi";

export default function ActionLogsPage({ tabs }: { tabs?: ReactNode }) {
  const { refresh } = useOutletContext<AdminPageContext>();
  const refreshVersion = getAdminRefreshVersion(refresh, "action-logs");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ActionLogSort>("created_at:desc");
  const [searchField, setSearchField] = useState<ActionLogSearchField>("actor_username");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState<{ field: ActionLogSearchField; value: string } | null>(null);
  const [result, setResult] = useState<ActionLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReactNode>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailState, setDetailState] = useState<{
    id: number; data: ActionLogDetail | null; error: ReactNode;
  } | null>(null);
  const selectedDetail = detailState?.id === selectedId ? detailState : null;
  const numericSearch = searchField === "actor_id" || searchField === "target_user_id";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedId(null);
    async function load() {
      try {
        const data = await fetchActionLogs(page, sort, search, controller.signal);
        if (controller.signal.aborted) return;
        if (page > Math.max(data.total_pages, 1)) { setPage(Math.max(data.total_pages, 1)); return; }
        setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(formatPermissionError(cause, "Unable to load action logs."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, sort, search, refreshVersion]);

  useEffect(() => {
    if (selectedId === null) { setDetailState(null); return; }
    const id = selectedId;
    const controller = new AbortController();
    setDetailState({ id, data: null, error: null });
    async function load() {
      try {
        const data = await fetchActionLogDetail(id, controller.signal);
        if (!controller.signal.aborted) setDetailState({ id, data, error: null });
      } catch (cause) {
        if (!controller.signal.aborted) setDetailState({ id, data: null,
          error: formatPermissionError(cause, "Unable to load action details.") });
      }
    }
    void load();
    return () => controller.abort();
  }, [selectedId]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchText.trim() ? { field: searchField, value: searchText.trim() } : null);
    setPage(1);
  }

  return <section className="admin-users admin-logs" aria-busy={loading}>
    <div className="admin-users__heading">
      {tabs}
      <div className="admin-users__heading-actions">
        <select className="admin-users__sort" aria-label="Sort action logs" value={sort}
          onChange={event => { setSort(event.target.value as ActionLogSort); setPage(1); }}>
          <option value="created_at:desc">Created ↓</option><option value="created_at:asc">Created ↑</option>
          <option value="id:desc">ID ↓</option><option value="id:asc">ID ↑</option>
        </select>
        <span className="admin-users__total">{result ? `${result.total} TOTAL` : "— TOTAL"}</span>
      </div>
    </div>
    {loading && !result ? <p className="admin-users__message" role="status">Loading action logs...</p>
      : error ? <div className="admin-users__message" role="alert">{error}</div>
      : result?.items.length ? <div className="admin-users__table-wrap">
        <table className="admin-users__table admin-logs__table">
          <colgroup><col style={{ width: 64 }} /><col /><col /><col style={{ width: 184 }} />
            <col style={{ width: 180 }} /><col style={{ width: 84 }} /></colgroup>
          <thead><tr><th scope="col">ID</th><th scope="col">ACTOR</th><th scope="col">TARGET</th>
            <th scope="col">ACTION</th><th scope="col">CREATED</th><th scope="col">DETAILS</th></tr></thead>
          <tbody>{result.items.map(log => <Fragment key={log.id}>
            <tr className={selectedId === log.id ? "admin-logs__selected" : undefined}>
              <td>{log.id}</td><td title={log.actor_username}>
                {log.actor_id == null ? log.actor_username || "—"
                  : <Link to={`/users/${log.actor_id}`}>{log.actor_username || "Unknown"}</Link>}
              </td>
              <td title={log.target_username}>
                {log.target_user_id == null ? log.target_username || "—"
                  : <Link to={`/users/${log.target_user_id}`}>{log.target_username || "Unknown"}</Link>}
              </td>
              <td><ActionLogTag action={log.action} /></td>
              <td>{formatLogTime(log.created_at)}</td>
              <td><button className="admin-logs__toggle" type="button" disabled={loading}
                aria-label={`${selectedId === log.id ? "Hide" : "View"} action log ${log.id}`}
                aria-expanded={selectedId === log.id} aria-controls={`action-log-${log.id}`}
                onClick={() => setSelectedId(current => current === log.id ? null : log.id)}>
                {selectedId === log.id ? "HIDE" : "VIEW"}</button></td>
            </tr>
            {selectedId === log.id && <tr className="admin-logs__detail-row"><td colSpan={6}>
              <section id={`action-log-${log.id}`} className="admin-logs__detail" aria-label={`Action log ${log.id} details`}>
                {selectedDetail?.error ? <div role="alert">{selectedDetail.error}</div>
                  : !selectedDetail?.data ? <p role="status">Loading details...</p>
                  : <>
                    <dl className="admin-logs__identities">
                      <div><dt>ACTOR</dt><dd>{selectedDetail.data.actor_id === null ? selectedDetail.data.actor_username || "—"
                        : <Link to={`/users/${selectedDetail.data.actor_id}`}>{selectedDetail.data.actor_username || "Unknown"} · id: {selectedDetail.data.actor_id}</Link>}</dd></div>
                      <div><dt>TARGET USER</dt><dd>{selectedDetail.data.target_user_id === null ? selectedDetail.data.target_username || "—"
                        : <Link to={`/users/${selectedDetail.data.target_user_id}`}>{selectedDetail.data.target_username || "Unknown"} · id: {selectedDetail.data.target_user_id}</Link>}</dd></div>
                      {Number.isSafeInteger(selectedDetail.data.details.chartset_id) && Number(selectedDetail.data.details.chartset_id) > 0 &&
                        <div><dt>CHARTSET</dt><dd><Link to={`/chartsets/${selectedDetail.data.details.chartset_id}`}>id: {String(selectedDetail.data.details.chartset_id)}</Link></dd></div>}
                    </dl>
                    <h3>NOTES</h3><p className="admin-logs__notes">{selectedDetail.data.notes || "—"}</p>
                    <h3>CHANGES</h3>
                    {selectedDetail.data.action.startsWith("chartset_to_") && <ChartsetStatusTransition
                      previousStatus={selectedDetail.data.details.previous_status}
                      newStatus={selectedDetail.data.details.new_status} />}
                    <pre>{JSON.stringify(selectedDetail.data.details, null, 2)}</pre>
                  </>}
              </section>
            </td></tr>}
          </Fragment>)}</tbody>
        </table>
      </div> : <p className="admin-users__message">No action logs found.</p>}
    <div className="admin-users__footer">
      {result && <Pagination label="Action log pages" page={page} displayPage={result.page}
        totalPages={result.total_pages} loading={loading} onPageChange={setPage} />}
      <form className="admin-users__search" onSubmit={submitSearch}>
        <select aria-label="Search action log field" value={searchField}
          onChange={event => { setSearchField(event.target.value as ActionLogSearchField); setSearchText(""); }}>
          <option value="actor_username">Actor name</option><option value="actor_id">Actor ID</option>
          <option value="target_username">Target name</option><option value="target_user_id">Target ID</option>
        </select>
        <input aria-label="Search action logs" type="search" placeholder="Search action logs"
          inputMode={numericSearch ? "numeric" : "text"} pattern={numericSearch ? "[1-9][0-9]*" : undefined}
          maxLength={numericSearch ? 19 : 24} value={searchText} onChange={event => setSearchText(event.target.value)} />
        <button type="submit">Search</button>
      </form>
    </div>
  </section>;
}
