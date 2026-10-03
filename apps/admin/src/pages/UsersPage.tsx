import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router";
import type { AdminPageContext } from "../adminContext";
import { getAdminRefreshVersion } from "../adminRefresh";
import Pagination from "../Pagination";
import { PermissionError, readPermissionError } from "../adminPermissions";
import { formatPermissionError } from "../Tags";

type SearchField = "username" | "user_id" | "steam_id";
type SortOption = "id:asc" | "id:desc" | "sr:asc" | "sr:desc" | "created_at:asc" | "created_at:desc";
type AccountStatusFilter = "all" | "active" | "banned";

type AdminUser = {
  id: number;
  username: string;
  steam_id: string;
  steam_profile_url: string | null;
  avatar_url: string | null;
  account_status: string;
  country_code: string | null;
  sr_total: string;
  rank: number | null;
};

type UserListResponse = {
  items: AdminUser[];
  page: number;
  total: number;
  total_pages: number;
};

export default function UsersPage() {
  const { refresh } = useOutletContext<AdminPageContext>();
  const refreshVersion = getAdminRefreshVersion(refresh, "user-list");
  const [page, setPage] = useState(1);
  const [searchField, setSearchField] = useState<SearchField>("username");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState<{ field: SearchField; value: string } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("id:asc");
  const [accountStatus, setAccountStatus] = useState<AccountStatusFilter>("all");
  const [result, setResult] = useState<UserListResponse | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function loadUsers() {
      try {
        const [sort, order] = sortOption.split(":");
        const params = new URLSearchParams({ page: String(page), sort, order });
        if (accountStatus !== "all") params.set("account_status", accountStatus);
        if (appliedSearch) params.set(appliedSearch.field, appliedSearch.value);
        const response = await fetch(`/api/v1/admin/users?${params}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw await readPermissionError(response, `Unable to load users (${response.status}).`, 1);
        const data = (await response.json()) as UserListResponse;
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (cause instanceof PermissionError) setResult(null);
          setError(formatPermissionError(cause, "Unable to load users."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadUsers();
    return () => controller.abort();
  }, [page, appliedSearch, sortOption, accountStatus, refreshVersion]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchText.trim();
    setAppliedSearch(value ? { field: searchField, value } : null);
    setPage(1);
  }

  return (
    <section className="admin-users" aria-busy={loading}>
      <div className="admin-users__heading">
        <div className="admin-users__heading-actions">
          <select
            className="admin-users__status-filter"
            aria-label="Filter users by account status"
            value={accountStatus}
            onChange={(event) => {
              setAccountStatus(event.target.value as AccountStatusFilter);
              setPage(1);
            }}
          >
            <option value="all">ALL</option>
            <option value="active">ACTIVE</option>
            <option value="banned">BANNED</option>
          </select>
          <select
            className="admin-users__sort"
            aria-label="Sort users"
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as SortOption);
              setPage(1);
            }}
          >
            <option value="id:asc">ID ↑</option>
            <option value="id:desc">ID ↓</option>
            <option value="sr:asc">SR ↑</option>
            <option value="sr:desc">SR ↓</option>
            <option value="created_at:asc">Created ↑</option>
            <option value="created_at:desc">Created ↓</option>
          </select>
          <span className="admin-users__total">{result ? `${result.total} TOTAL` : "— TOTAL"}</span>
        </div>
      </div>

      {error && result && (
        <div className="admin-users__message" role="alert">{error}</div>
      )}
      {loading && !result ? (
        <p className="admin-users__message">Loading users...</p>
      ) : error && !result ? (
        <div className="admin-users__message" role="alert">{error}</div>
      ) : result?.items.length ? (
        <div className="admin-users__table-wrap">
          <table className="admin-users__table">
            <colgroup>
              <col className="admin-users__column--id" />
              <col />
              <col className="admin-users__column--steam" />
              <col className="admin-users__column--country" />
              <col className="admin-users__column--sr" />
              <col className="admin-users__column--rank" />
              <col className="admin-users__column--status" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">USER</th>
                <th scope="col">STEAM ID</th>
                <th scope="col">COUNTRY</th>
                <th scope="col">SR</th>
                <th scope="col">GLOBAL RANK</th>
                <th scope="col">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <Link className="admin-users__identity admin-users__identity-link" to={`/users/${user.id}`}>
                      <span className="admin-users__avatar" aria-hidden="true">
                        {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username.charAt(0)}
                      </span>
                      <span>{user.username}</span>
                    </Link>
                  </td>
                  <td>
                    {user.steam_profile_url ? (
                      <a className="admin-users__steam-profile" href={user.steam_profile_url} target="_blank" rel="noopener noreferrer">
                        {user.steam_id}
                      </a>
                    ) : <span className="admin-users__steam-profile">{user.steam_id}</span>}
                  </td>
                  <td>{user.country_code ?? "—"}</td>
                  <td>{user.sr_total}</td>
                  <td>{user.rank == null ? "—" : `#${user.rank}`}</td>
                  <td>
                    <span className={`admin-users__status admin-users__status--${user.account_status}`}>
                      {user.account_status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-users__message">No users found.</p>
      )}

      <div className="admin-users__footer">
        {result && <Pagination label="User list pages" page={page} displayPage={result.page}
          totalPages={result.total_pages} loading={loading} onPageChange={setPage} />}
        <form className="admin-users__search" onSubmit={submitSearch}>
          <select
            aria-label="Search field"
            value={searchField}
            onChange={(event) => {
              setSearchField(event.target.value as SearchField);
              setSearchText("");
            }}
          >
            <option value="username">Username</option>
            <option value="user_id">User ID</option>
            <option value="steam_id">Steam ID</option>
          </select>
          <input
            aria-label="Search users"
            type="search"
            inputMode={searchField === "user_id" ? "numeric" : "text"}
            pattern={searchField === "user_id" ? "[1-9][0-9]*" : undefined}
            title={searchField === "user_id" ? "Enter a positive user ID" : undefined}
            maxLength={searchField === "username" ? 64 : searchField === "steam_id" ? 32 : 19}
            placeholder="Search users"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </section>
  );
}
