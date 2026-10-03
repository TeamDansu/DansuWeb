import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { useLocation } from "react-router";
import UserProfile, { type UserProfileData } from "./UserProfile";
import type { UserDetail } from "./userTypes";
import { fetchUserDetail, fetchUserProfile } from "./userApi";
import { fetchChartsetDetail } from "./chartsetApi";
import type { AdminUpdate } from "./adminRefresh";
import ChartsetCard from "./ChartsetCard";
import ChartsetStatusSelect from "./ChartsetStatusSelect";
import { ChartsetStatusTag, GroupTags, PrivilegeTags, formatPermissionError } from "./Tags";
import type { ChartsetStatus, ChartsetSummary } from "./chartTypes";
import { toChartsetSummary } from "./chartsetSummary";
import AdminButton from "./AdminButton";
import { getActionTabs, hasActionPrivilege, readPermissionError, type ActionPermissions, type ActionTab } from "./adminPermissions";

export type ActionTarget = UserProfileData & Partial<Pick<UserDetail, "groups" | "privileges">>;

type ActionMessage = { text: string; tone: "danger" | "success" };
type ChartsetTarget = ChartsetSummary;

const chartsetStatusTransitions: Record<ChartsetStatus, readonly ChartsetStatus[]> = {
  published: [],
  pending: ["published", "approved"],
  approved: ["pending", "ranked"],
  ranked: ["approved"],
};

export type UserActionsState = {
  open: boolean;
  tab: ActionTab;
  user: ActionTarget | null;
  chartset: ChartsetTarget | null;
};

async function checkResponse(response: Response, required: number | "super") {
  if (response.ok) return;
  const fallback = response.status === 401 ? "Your session expired. Sign in again."
    : response.status === 403 ? "You do not have permission to perform this action."
    : `Request failed (${response.status}).`;
  throw await readPermissionError(response, fallback, required);
}

function isUserDetail(user: UserProfileData): user is UserDetail {
  return "stats" in user;
}

export default function UserActions({ profile, state, setState, onUpdated }: {
  profile: ActionPermissions | null;
  state: UserActionsState;
  setState: Dispatch<SetStateAction<UserActionsState>>;
  onUpdated: (change: AdminUpdate) => void;
}) {
  const { pathname } = useLocation();
  const detailPathRef = useRef(pathname);
  detailPathRef.current = pathname;
  const { user, chartset, open } = state;
  const visibleTabs = getActionTabs(profile);
  const tab = visibleTabs.includes(state.tab) ? state.tab : visibleTabs[0] ?? "users";
  function setOpen(value: boolean) { setState(current => ({ ...current, open: value })); }
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [targetId, setTargetId] = useState("");
  const [chartsetId, setChartsetId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ChartsetStatus | null>(null);
  const [accessDraft, setAccessDraft] = useState({ groups: user?.groups ?? 0, privileges: user?.privileges ?? 0 });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const banned = user?.account_status === "banned";
  const isAccessTab = tab === "access";
  const isUserTab = tab === "users" || isAccessTab;
  const isStatusTab = tab === "status";
  const lookupId = isUserTab ? targetId : chartsetId;
  const availableStatuses = chartset && !chartset.is_removed ? chartsetStatusTransitions[chartset.status]
    .filter(status => hasActionPrivilege(profile, status === "ranked" ? 8 : 4)) : [];
  const targetStatus = selectedStatus && availableStatuses.includes(selectedStatus) ? selectedStatus : "";
  const hasUserAccess = user?.groups !== undefined && user?.privileges !== undefined;
  const accessChanges = user && hasUserAccess ? {
    ...(accessDraft.groups !== user.groups ? { groups: accessDraft.groups } : {}),
    ...(accessDraft.privileges !== user.privileges ? { privileges: accessDraft.privileges } : {}),
  } : {};
  const canChangeAccess = hasUserAccess && Object.keys(accessChanges).length > 0 && (accessDraft.groups & 1) !== 0;
  const isDangerAction = !isAccessTab && !isStatusTab && (isUserTab ? !banned : !chartset?.is_removed);
  const noteLabel = isAccessTab ? "NOTE" : isUserTab ? banned ? "UNBAN REASON" : "BAN REASON"
    : isStatusTab ? "STATUS CHANGE NOTE" : chartset?.is_removed ? "RESTORE REASON" : "DELETE REASON";
  const actionLabel = isAccessTab ? "CHANGE GROUPS & PRIVILEGES" : isUserTab ? banned ? "UNBAN USER" : "BAN USER"
    : isStatusTab ? "CHANGE STATUS" : chartset?.is_removed ? "RESTORE CHARTSET" : "SOFT DELETE CHARTSET";

  useEffect(() => {
    if (visibleTabs.length && state.tab !== tab) setState(current => ({ ...current, tab }));
  }, [state.tab, tab, visibleTabs.length, setState]);

  useEffect(() => {
    if (user) {
      setTargetId(String(user.id));
      setError(null);
    }
    setNotes("");
    setMessage(null);
  }, [user?.id]);

  useEffect(() => {
    setAccessDraft({ groups: user?.groups ?? 0, privileges: user?.privileges ?? 0 });
  }, [user?.id, user?.groups, user?.privileges]);

  useEffect(() => {
    if (chartset) {
      setChartsetId(String(chartset.id));
      setError(null);
    }
    setNotes("");
    setMessage(null);
  }, [chartset?.id]);

  useEffect(() => {
    setSelectedStatus(null);
  }, [chartset?.id, chartset?.status]);

  useEffect(() => {
    setNotes("");
    setError(null);
    setMessage(null);
  }, [tab]);

  useEffect(() => {
    if (!open || !isAccessTab || !user || hasUserAccess || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError(null);
    const id = user.id;
    async function loadAccess() {
      try {
        const detail = await fetchUserDetail(id, controller.signal);
        if (!controller.signal.aborted) {
          setState(current => current.user?.id === id ? { ...current, user: detail } : current);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(formatPermissionError(cause, "Unable to load user access."));
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setBusy(false);
        }
      }
    }
    void loadAccess();
    return () => {
      controller.abort();
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    };
  }, [open, isAccessTab, user?.id, hasUserAccess, setState]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 1000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function selectTab(value: ActionTab) {
    if (requestRef.current || !visibleTabs.includes(value)) return;
    setState(current => ({ ...current, tab: value }));
    setNotes("");
    setError(null);
    setMessage(null);
  }

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
    };
  }, [open, setState]);

  async function selectTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visibleTabs.includes(tab) || requestRef.current || !/^[1-9][0-9]*$/.test(lookupId)) return;
    const id = Number(lookupId);
    if (!Number.isSafeInteger(id)) { setError("Enter a valid ID."); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError(null);
    setMessage(null);
    setState(current => isUserTab ? { ...current, user: null } : { ...current, chartset: null });
    try {
      if (isUserTab) {
        const target = await fetchTargetUser(id, controller.signal);
        if (!controller.signal.aborted) setState(current => ({ ...current, user: target }));
      } else {
        const target = await fetchChartsetDetail(id, controller.signal);
        if (!controller.signal.aborted) setState(current => ({ ...current, chartset: toChartsetSummary(target) }));
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(formatPermissionError(cause, "Unable to load target."));
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function fetchTargetUser(id: number, signal: AbortSignal) {
    const needsDetail = isAccessTab || detailPathRef.current.replace(/\/$/, "") === `/users/${id}`;
    return needsDetail ? fetchUserDetail(id, signal) : fetchUserProfile(id, signal);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visibleTabs.includes(tab) || !user || requestRef.current || !notes.trim() || (isAccessTab && !canChangeAccess)) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError(null);
    setMessage(null);
    let saved = false;
    const change: AdminUpdate = { kind: isAccessTab ? "user-access" : "user-account-status", userId: user.id };
    try {
      const endpoint = isAccessTab ? "access" : banned ? "unban" : "ban";
      const response = await fetch(`/api/v1/admin/users/${user.id}/${endpoint}`, {
        method: isAccessTab ? "PATCH" : "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isAccessTab ? accessChanges : {}), notes: notes.trim() }),
      });
      await checkResponse(response, isAccessTab ? "super" : 1);
      saved = true;
      const updated = await fetchTargetUser(user.id, controller.signal);
      if (!controller.signal.aborted) {
        const detail = isUserDetail(updated) ? updated : undefined;
        setState(current => ({ ...current, user: updated }));
        if (isAccessTab && detail) setAccessDraft({ groups: detail.groups, privileges: detail.privileges });
        onUpdated({ ...change, detail: updated });
        setNotes("");
        setMessage({
          text: isAccessTab ? "Groups & privileges updated." : endpoint === "ban" ? "User banned." : "User unbanned.",
          tone: endpoint === "ban" ? "danger" : "success",
        });
      }
    } catch (cause) {
      if (saved) onUpdated(change);
      if (!controller.signal.aborted) {
        if (saved && isAccessTab) setState(current => ({ ...current, user: null }));
        setError(saved ? "Action saved, but the profile could not be refreshed. Load the user again before retrying."
          : formatPermissionError(cause, "Unable to perform action."));
      }
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function submitChartset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visibleTabs.includes(tab) || !chartset || requestRef.current || !notes.trim() || (isStatusTab && !targetStatus)) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError(null);
    setMessage(null);
    let saved = false;
    let change: AdminUpdate = {
      kind: isStatusTab ? "chartset-status" : chartset.is_removed ? "chartset-restore" : "chartset-delete",
      chartsetId: chartset.id,
    };
    try {
      const restoring = chartset.is_removed;
      const endpoint = isStatusTab ? `/${targetStatus}` : restoring ? "/restore" : "";
      const response = await fetch(`/api/v1/admin/chartsets/${chartset.id}${endpoint}`, {
        method: isStatusTab || restoring ? "POST" : "DELETE",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() }),
      });
      await checkResponse(response, isStatusTab && targetStatus !== "ranked" ? 4 : 8);
      saved = true;
      if (isStatusTab) {
        const log = await response.json().catch(() => null) as { details?: {
          previous_status?: ChartsetStatus; new_status?: ChartsetStatus;
        } } | null;
        change = { ...change, previousStatus: log?.details?.previous_status, newStatus: log?.details?.new_status };
      }
      const updated = await fetchChartsetDetail(chartset.id, controller.signal);
      if (!controller.signal.aborted) {
        setState(current => current.chartset?.id === updated.id
          ? { ...current, chartset: toChartsetSummary(updated) } : current);
        onUpdated({ ...change, detail: updated });
        setNotes("");
        setMessage({
          text: isStatusTab ? "Status updated." : restoring ? "Chartset restored." : "Chartset soft-deleted.",
          tone: isStatusTab || restoring ? "success" : "danger",
        });
      }
    } catch (cause) {
      if (saved) onUpdated(change);
      if (!controller.signal.aborted) {
        if (saved) setState(current => current.chartset?.id === chartset.id ? { ...current, chartset: null } : current);
        setError(saved ? "Action saved, but the chartset could not be refreshed. Load it again before retrying."
          : formatPermissionError(cause, "Unable to perform action."));
      }
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  if (!visibleTabs.length) return null;

  return (
    <div className="admin-user-actions">
      {open && (
        <section className="admin-user-actions__panel" id="user-actions-panel" role="dialog" aria-label="Admin actions">
          <div className={`admin-user-actions__content${message ? " admin-user-actions__content--blurred" : ""}`}>
          <header>
            <div className="admin-user-actions__tabs" role="tablist" aria-label="Admin action categories">
            {visibleTabs.map(value => (
              <button key={value} type="button" role="tab" className={value === "access" ? "admin-user-actions__access-tab" : undefined} id={`actions-tab-${value}`} aria-selected={tab === value} aria-controls="actions-tab-panel" disabled={busy} onClick={() => selectTab(value)}>
                {value === "access" ? "GROUPS & PRIVILEGES" : value.toUpperCase()}
              </button>
            ))}
            </div>
            <AdminButton ref={closeRef} className="admin-user-actions__close" size="icon" tone="danger" aria-label="Close admin actions" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} icon={
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M14 5H6v30h8M14 20h20m-8-8 8 8-8 8" />
              </svg>
            } />
          </header>
          <div className="admin-user-actions__body" role="tabpanel" id="actions-tab-panel" aria-labelledby={`actions-tab-${tab}`}>
          <form className="admin-user-actions__lookup" onSubmit={selectTarget}>
            <div>
              <input id="action-target-id" aria-label={isUserTab ? "USER ID" : "CHARTSET ID"} inputMode="numeric" pattern="[1-9][0-9]*" required maxLength={19} value={lookupId} onChange={(event) => isUserTab ? setTargetId(event.target.value) : setChartsetId(event.target.value)} disabled={busy} placeholder={isUserTab ? "Enter user ID" : "Enter chartset ID"} />
              <button type="submit" disabled={busy || !lookupId}>{isUserTab ? "LOAD USER" : "LOAD CHARTSET"}</button>
            </div>
          </form>
          <div className="admin-user-actions__target">
          {isUserTab ? user ? <>
          <UserProfile user={user} />
          {isAccessTab && hasUserAccess && <div className="admin-user-actions__access">
            <section aria-label="User groups">
              <h3>GROUPS</h3>
              <GroupTags flags={accessDraft.groups} partitioned disabled={busy}
                onChange={groups => setAccessDraft(current => ({ ...current, groups }))} />
            </section>
            <section aria-label="User privileges">
              <h3>PRIVILEGES</h3>
              <PrivilegeTags flags={accessDraft.privileges} partitioned disabled={busy}
                onChange={privileges => setAccessDraft(current => ({ ...current, privileges }))} />
            </section>
          </div>}
          {isAccessTab && !hasUserAccess && busy && <p className="admin-user-actions__hint">Loading groups & privileges...</p>}
          </> : busy ? <p className="admin-user-actions__hint">Loading user...</p> : null
          : chartset ? <>
            <div className="admin-user-actions__chartset">
              <ChartsetCard key={chartset.id} chartset={chartset} />
            </div>
            {isStatusTab && <div className="admin-user-actions__status-transition" role="group" aria-label="Chartset status change">
              <ChartsetStatusTag status={chartset.status} className="admin-user-actions__current-status" title="Current status" />
              <svg className="admin-user-actions__status-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h16m-6-6 6 6-6 6" />
              </svg>
              <ChartsetStatusSelect key={`${chartset.id}-${chartset.status}`} options={availableStatuses} value={targetStatus}
                disabled={busy || availableStatuses.length === 0} onChange={setSelectedStatus} />
            </div>}
          </> : busy ? <p className="admin-user-actions__hint">Loading chartset...</p> : null}
          </div>
          {error && <div className="admin-user-actions__error" role="alert">{error}</div>}
          {(isUserTab ? user : chartset) && <form className={`admin-user-actions__footer${isAccessTab ? " admin-user-actions__footer--access" : ""}`} onSubmit={isUserTab ? submit : submitChartset}>
            <fieldset disabled={busy}>
              <label className="admin-user-actions__notes">
                {noteLabel}
                <textarea maxLength={2000} required value={notes} onChange={event => setNotes(event.target.value)}
                  placeholder="Recorded in the admin action log" rows={3} />
              </label>
              <button className={`admin-user-actions__submit${isDangerAction ? " admin-user-actions__submit--danger" : ""}`}
                type="submit" disabled={busy || !notes.trim() || (isAccessTab && !canChangeAccess) || (isStatusTab && !targetStatus)}>
                {busy ? "SAVING..." : actionLabel}
              </button>
            </fieldset>
          </form>}
          </div>
          </div>
          {message && <p className={`admin-user-actions__success admin-user-actions__success--${message.tone}`} role="status">{message.text}</p>}
        </section>
      )}
      <AdminButton ref={triggerRef} className="admin-user-actions__trigger" aria-expanded={open} aria-controls="user-actions-panel" onClick={() => setOpen(!open)}>
        ADMIN ACTIONS <span aria-hidden="true">{open ? "−" : "+"}</span>
      </AdminButton>
    </div>
  );
}
