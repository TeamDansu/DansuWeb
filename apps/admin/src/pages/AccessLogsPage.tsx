import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import Pagination from "../Pagination";
import { formatLogTime } from "../adminLogsApi";
import { formatPermissionError } from "../Tags";
import { fetchAccessLogs, fetchAccessLogDetail, type AccessLogPage, type AccessLogDetail,
  type AccessLogSearchField, type AccessLogSort, type AccessResult } from "../accessLogsApi";

export default function AccessLogsPage({ tabs }: { tabs?: ReactNode }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AccessLogSort>("created_at:desc");
  const [resultFilter, setResultFilter] = useState<AccessResult | "">("");
  const [searchField, setSearchField] = useState<AccessLogSearchField>("username");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState<{ field: AccessLogSearchField; value: string } | null>(null);
  const [result, setResult] = useState<AccessLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReactNode>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailState, setDetailState] = useState<{
    id: number; data: AccessLogDetail | null; error: ReactNode;
  } | null>(null);
  const selectedDetail = detailState?.id === selectedId ? detailState : null;
  const numericSearch = searchField === "user_id";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedId(null);
    async function load() {
      try {
        const data = await fetchAccessLogs(page, sort, search, resultFilter, controller.signal);
        if (controller.signal.aborted) return;
        if (page > Math.max(data.total_pages, 1)) { setPage(Math.max(data.total_pages, 1)); return; }
        setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(formatPermissionError(cause, "Unable to load access logs."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, sort, search, resultFilter]);

  useEffect(() => {
    if (selectedId === null) { setDetailState(null); return; }
    const id = selectedId;
    const controller = new AbortController();
    setDetailState({ id, data: null, error: null });
    async function load() {
      try {
        const data = await fetchAccessLogDetail(id, controller.signal);
        if (!controller.signal.aborted) setDetailState({ id, data, error: null });
      } catch (cause) {
        if (!controller.signal.aborted) setDetailState({ id, data: null,
          error: formatPermissionError(cause, "Unable to load access details.") });
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
        <select className="admin-users__sort" aria-label="Filter access result" value={resultFilter}
          onChange={event => { setResultFilter(event.target.value as AccessResult | ""); setPage(1); }}>
          <option value="">All results</option><option value="granted">Granted</option><option value="denied">Denied</option>
        </select>
        <select className="admin-users__sort" aria-label="Sort access logs" value={sort}
          onChange={event => { setSort(event.target.value as AccessLogSort); setPage(1); }}>
          <option value="created_at:desc">Created ↓</option><option value="created_at:asc">Created ↑</option>
          <option value="id:desc">ID ↓</option><option value="id:asc">ID ↑</option>
        </select>
        <span className="admin-users__total">{result ? `${result.total} TOTAL` : "— TOTAL"}</span>
      </div>
    </div>
    {loading && !result ? <p className="admin-users__message" role="status">Loading access logs...</p>
      : error ? <div className="admin-users__message" role="alert">{error}</div>
      : result?.items.length ? <div className="admin-users__table-wrap">
        <table className="admin-users__table admin-logs__table">
          <colgroup><col style={{ width: 64 }} /><col style={{ width: "26%" }} /><col />
            <col style={{ width: 180 }} /><col style={{ width: 84 }} /></colgroup>
          <thead><tr><th scope="col">ID</th><th scope="col">USER</th><th scope="col">PAGE</th>
            <th scope="col">CREATED</th><th scope="col">DETAILS</th></tr></thead>
          <tbody>{result.items.map(log => <Fragment key={log.id}>
            <tr className={selectedId === log.id ? "admin-logs__selected" : undefined}>
              <td>{log.id}</td><td title={log.username ?? undefined}>{log.username || "—"}</td>
              <td title={log.page_path}>{log.page_path}</td><td>{formatLogTime(log.created_at)}</td>
              <td><button className="admin-logs__toggle" type="button" disabled={loading}
                aria-label={`${selectedId === log.id ? "Hide" : "View"} access log ${log.id}`}
                aria-expanded={selectedId === log.id} aria-controls={`access-log-${log.id}`}
                onClick={() => setSelectedId(current => current === log.id ? null : log.id)}>
                {selectedId === log.id ? "HIDE" : "VIEW"}</button></td>
            </tr>
            {selectedId === log.id && <tr className="admin-logs__detail-row"><td colSpan={5}>
              <section id={`access-log-${log.id}`} className="admin-logs__detail" aria-label={`Access log ${log.id} details`}>
                {selectedDetail?.error ? <div role="alert">{selectedDetail.error}</div>
                  : !selectedDetail?.data ? <p role="status">Loading details...</p>
                  : <>
                    <dl className="admin-logs__identities">
                      <div><dt>USER</dt><dd>{selectedDetail.data.user_id == null ? selectedDetail.data.username || "—"
                        : <Link to={`/users/${selectedDetail.data.user_id}`}>{selectedDetail.data.username || "Unknown"} · id: {selectedDetail.data.user_id}</Link>}</dd></div>
                      <div><dt>RESULT</dt><dd><span className="admin-profile-tag"
                        style={selectedDetail.data.result === "granted"
                          ? { color: "#9de4b8", borderColor: "#9de4b866", backgroundColor: "#9de4b81f" }
                          : { color: "#ff8f94", borderColor: "#ff8f9466", backgroundColor: "#ff8f941f" }}>
                        {selectedDetail.data.result.toUpperCase()}</span></dd></div>
                      <div><dt>IP ADDRESS</dt><dd>{selectedDetail.data.ip_address || "—"}</dd></div>
                    </dl>
                    <h3>PAGE</h3><p className="admin-logs__notes">{selectedDetail.data.page_path}</p>
                    <h3>USER AGENT</h3><p className="admin-logs__notes">{selectedDetail.data.user_agent || "—"}</p>
                  </>}
              </section>
            </td></tr>}
          </Fragment>)}</tbody>
        </table>
      </div> : <p className="admin-users__message">No access logs found.</p>}
    <div className="admin-users__footer">
      {result && <Pagination label="Access log pages" page={page} displayPage={result.page}
        totalPages={result.total_pages} loading={loading} onPageChange={setPage} />}
      <form className="admin-users__search" onSubmit={submitSearch}>
        <select aria-label="Search access log field" value={searchField}
          onChange={event => { setSearchField(event.target.value as AccessLogSearchField); setSearchText(""); }}>
          <option value="username">User name</option><option value="user_id">User ID</option><option value="page_path">Page path</option>
        </select>
        <input aria-label="Search access logs" type="search" placeholder="Search access logs"
          inputMode={numericSearch ? "numeric" : "text"} pattern={numericSearch ? "[1-9][0-9]*" : undefined}
          maxLength={numericSearch ? 19 : searchField === "page_path" ? 512 : 24}
          value={searchText} onChange={event => setSearchText(event.target.value)} />
        <button type="submit">Search</button>
      </form>
    </div>
  </section>;
}
