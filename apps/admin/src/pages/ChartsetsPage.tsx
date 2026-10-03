import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useOutletContext } from "react-router";
import type { AdminPageContext } from "../adminContext";
import { getAdminRefreshVersion } from "../adminRefresh";
import type { ChartsetStatus, ChartsetSummary } from "../chartTypes";
import ChartsetCard from "../ChartsetCard";
import Pagination from "../Pagination";
import { readPermissionError } from "../adminPermissions";
import { formatPermissionError } from "../Tags";

type SearchField = "q" | "chartset_id" | "chartset_uuid" | "owner_id";
type SortOption = "id:asc" | "id:desc" | "created_at:asc" | "created_at:desc" | "updated_at:asc" | "updated_at:desc";
type RemovedFilter = "all" | "false" | "true";

type ChartsetListResponse = {
  items: ChartsetSummary[];
  page: number;
  total: number;
  total_pages: number;
};

export default function ChartsetsPage() {
  const { refresh } = useOutletContext<AdminPageContext>();
  const refreshVersion = getAdminRefreshVersion(refresh, "chartset-list");
  const [page, setPage] = useState(1);
  const [searchField, setSearchField] = useState<SearchField>("q");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState<{ field: SearchField; value: string } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("created_at:desc");
  const [status, setStatus] = useState<ChartsetStatus | "all">("all");
  const [removed, setRemoved] = useState<RemovedFilter>("all");
  const [result, setResult] = useState<ChartsetListResponse | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function loadChartsets() {
      try {
        const [sort, order] = sortOption.split(":");
        const params = new URLSearchParams({ page: String(page), limit: "20", sort, order });
        if (status !== "all") params.set("status", status);
        if (removed !== "all") params.set("is_removed", removed);
        if (appliedSearch) params.set(appliedSearch.field, appliedSearch.value);
        const response = await fetch(`/api/v1/admin/chartsets?${params}`, {
          credentials: "same-origin", signal: controller.signal,
        });
        if (!response.ok) {
          throw await readPermissionError(response, `Unable to load chartsets (${response.status}).`, 4);
        }
        const data = await response.json() as ChartsetListResponse;
        if (controller.signal.aborted) return;
        if (page > Math.max(data.total_pages, 1)) {
          setPage(Math.max(data.total_pages, 1));
          return;
        }
        setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(formatPermissionError(cause, "Unable to load chartsets."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadChartsets();
    return () => controller.abort();
  }, [page, appliedSearch, sortOption, status, removed, refreshVersion]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchText.trim();
    setAppliedSearch(value ? { field: searchField, value } : null);
    setPage(1);
  }

  const numericSearch = searchField === "chartset_id" || searchField === "owner_id";

  return (
    <section className="admin-users admin-chartsets" aria-busy={loading}>
      <div className="admin-users__heading">
        <div className="admin-users__heading-actions">
          <select className="admin-users__status-filter" aria-label="Filter chartsets by status" value={status}
            onChange={event => { setStatus(event.target.value as ChartsetStatus | "all"); setPage(1); }}>
            <option value="all">ALL STATUSES</option>
            <option value="pending">PENDING</option>
            <option value="approved">APPROVED</option>
            <option value="ranked">RANKED</option>
            <option value="published">PUBLISHED</option>
          </select>
          <select className="admin-users__status-filter" aria-label="Filter chartsets by removal status" value={removed}
            onChange={event => { setRemoved(event.target.value as RemovedFilter); setPage(1); }}>
            <option value="all">ALL CHARTSETS</option>
            <option value="false">AVAILABLE</option>
            <option value="true">REMOVED</option>
          </select>
          <select className="admin-users__sort" aria-label="Sort chartsets" value={sortOption}
            onChange={event => { setSortOption(event.target.value as SortOption); setPage(1); }}>
            <option value="id:asc">ID ↑</option><option value="id:desc">ID ↓</option>
            <option value="created_at:asc">Created ↑</option><option value="created_at:desc">Created ↓</option>
            <option value="updated_at:asc">Updated ↑</option><option value="updated_at:desc">Updated ↓</option>
          </select>
          <span className="admin-users__total">{result ? `${result.total} TOTAL` : "— TOTAL"}</span>
        </div>
      </div>

      {error && result && <div className="admin-users__message" role="alert">{error}</div>}
      {loading && !result ? <p className="admin-users__message">Loading chartsets...</p>
        : error && !result ? <div className="admin-users__message" role="alert">{error}</div>
        : result?.items.length ? (
          <ul className="admin-chartsets__grid" aria-label="Chartsets">
            {result.items.map(chartset => <ChartsetCard as="li" key={chartset.id} chartset={chartset} />)}
          </ul>
        ) : <p className="admin-users__message">No chartsets found.</p>}

      <div className="admin-users__footer">
        {result && <Pagination label="Chartset list pages" page={page} displayPage={result.page}
          totalPages={result.total_pages} loading={loading} onPageChange={setPage} />}
        <form className="admin-users__search" onSubmit={submitSearch}>
          <select aria-label="Search field" value={searchField}
            onChange={event => { setSearchField(event.target.value as SearchField); setSearchText(""); }}>
            <option value="q">Text</option><option value="chartset_id">Chartset ID</option>
            <option value="chartset_uuid">UUID</option><option value="owner_id">Owner ID</option>
          </select>
          <input aria-label="Search chartsets" type="search" inputMode={numericSearch ? "numeric" : "text"}
            pattern={numericSearch ? "[1-9][0-9]*" : searchField === "chartset_uuid" ? "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" : undefined}
            title={numericSearch ? "Enter a positive ID" : searchField === "chartset_uuid" ? "Enter a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)" : undefined}
            maxLength={numericSearch ? 19 : searchField === "chartset_uuid" ? 36 : 255}
            placeholder="Search chartsets" value={searchText} onChange={event => setSearchText(event.target.value)} />
          <button type="submit">Search</button>
        </form>
      </div>
    </section>
  );
}
