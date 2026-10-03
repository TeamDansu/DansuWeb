import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useOutletContext } from "react-router";
import AdminAccessGate, { type BrowserProfileContext } from "./auth/AdminAccessGate";
import ProfileMenu from "./ProfileMenu";
import ChartsetsPage from "./pages/ChartsetsPage";
import ChartsetDetailPage from "./pages/ChartsetDetailPage";
import DashboardPage from "./pages/DashboardPage";
import UserDetailPage from "./pages/UserDetailPage";
import UsersPage from "./pages/UsersPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import UserActions, { type ActionTarget, type UserActionsState } from "./UserActions";
import type { AdminPageContext } from "./adminContext";
import type { ChartsetSummary } from "./chartTypes";
import { applyAdminUpdate, initialAdminRefresh, type AdminUpdate } from "./adminRefresh";
import AdminButton from "./AdminButton";

const navigation = [
  { to: "/", label: "DASHBOARD", title: "DASHBOARD", end: true },
  { to: "/users", label: "USERS", title: "USER MANAGEMENT" },
  { to: "/chartsets", label: "CHARTSETS", title: "CHARTSET MANAGEMENT" },
  { to: "/logs", label: "ADMIN LOGS", title: "ADMIN LOGS" },
];

function AdminLayout({ actions, setActions, pageContext, onAdminUpdated }: {
  actions: UserActionsState;
  setActions: Dispatch<SetStateAction<UserActionsState>>;
  pageContext: AdminPageContext;
  onAdminUpdated: (change: AdminUpdate) => void;
}) {
  const { profile, profileError, checkingAccess, updateProfileAccess } = useOutletContext<BrowserProfileContext>();
  const { pathname } = useLocation();
  useEffect(() => {
    const tab = pathname === "/chartsets" || pathname.startsWith("/chartsets/") ? "chartsets"
      : pathname === "/users" || pathname.startsWith("/users/") ? "users" : null;
    if (tab) setActions(current => current.tab === tab ? current : { ...current, tab });
  }, [pathname, setActions]);
  const pageTitle = pathname.startsWith("/users/")
    ? "USER DETAIL"
    : pathname.startsWith("/chartsets/") ? "CHARTSET DETAIL"
    : navigation.find(({ to }) => to === pathname)?.title ?? "PAGE NOT FOUND";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="admin-brand" to="/" aria-label="Dansu Admin home">
          <span className="admin-brand__wordmark">DANSU ADMIN</span>
        </NavLink>

        <div className="admin-sidebar__navigation">
          <nav aria-label="Admin navigation">
            {navigation.map(({ to, label, end }) => (
              <AdminButton
                key={to}
                to={to}
                end={end}
                navigation
                size="small"
                className="admin-nav-link"
              >
                <span>{label}</span>
              </AdminButton>
            ))}
          </nav>
        </div>
      </aside>

      <div className="admin-shell__content">
        <header className="admin-topbar">
          <div className="admin-topbar__location">
            <h1>{pageTitle}</h1>
          </div>
          {profile ? (
            <ProfileMenu profile={profile} />
          ) : profileError ? (
            <span className="admin-topbar__profile-message">Profile unavailable</span>
          ) : null}
        </header>
        <main className="admin-main" aria-busy={checkingAccess}>
          {checkingAccess ? (
            <p className="admin-users__message" role="status">Checking access...</p>
          ) : <Outlet context={pageContext} />}
        </main>
        <div hidden={checkingAccess}>
          <UserActions profile={profile} state={actions} setState={setActions} onUpdated={change => {
            if ("userId" in change && change.detail && "stats" in change.detail) updateProfileAccess(change.detail);
            onAdminUpdated(change);
          }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [actions, setActions] = useState<UserActionsState>({ open: false, tab: "users", user: null, chartset: null });
  const [refresh, setRefresh] = useState(initialAdminRefresh);
  const onAdminUpdated = useCallback((change: AdminUpdate) => {
    setRefresh(current => applyAdminUpdate(current, change));
  }, []);
  const selectActionUser = useCallback((user: ActionTarget | null) => {
    setActions(value => ({ ...value, user }));
  }, []);
  const updateActionUser = useCallback((user: ActionTarget) => {
    setActions(value => value.user?.id === user.id ? { ...value, user } : value);
  }, []);
  const selectActionChartset = useCallback((chartset: ChartsetSummary | null) => {
    setActions(value => ({ ...value, chartset }));
  }, []);
  const updateActionChartset = useCallback((chartset: ChartsetSummary) => {
    setActions(value => value.chartset?.id === chartset.id ? { ...value, chartset } : value);
  }, []);
  return (
    <Routes>
      <Route element={<AdminAccessGate />}>
        <Route element={<AdminLayout actions={actions} setActions={setActions}
          pageContext={{ refresh,
            selectActionUser, updateActionUser, selectActionChartset, updateActionChartset }}
          onAdminUpdated={onAdminUpdated} />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="chartsets" element={<ChartsetsPage />} />
          <Route path="chartsets/:chartsetId" element={<ChartsetDetailPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="action-logs" element={<Navigate to="/logs" replace />} />
          <Route path="access-logs" element={<Navigate to="/logs?tab=access" replace />} />
          <Route path="*" element={<h2>Page not found.</h2>} />
        </Route>
      </Route>
    </Routes>
  );
}
