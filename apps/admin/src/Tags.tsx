import type { ChartsetStatus, ChartsetSummary } from "./chartTypes";
import { PermissionError } from "./adminPermissions";

type AccessFlag = { bit: number; label: string; color: string };

const groups: AccessFlag[] = [
  { bit: 1 << 0, label: "NORMAL", color: "#b8bdd0" },
  { bit: 1 << 1, label: "ADMIN", color: "#f394af" },
  { bit: 1 << 2, label: "DEVELOPER", color: "#7cb9ff" },
  { bit: 1 << 3, label: "MODERATOR", color: "#ffca79" },
  { bit: 1 << 4, label: "CHART REVIEWER", color: "#c6a5ff" },
];

const privileges: AccessFlag[] = [
  { bit: 1 << 0, label: "BAN USERS", color: "#ff8f94" },
  { bit: 1 << 1, label: "EDIT USERS", color: "#87d8dc" },
  { bit: 1 << 2, label: "REVIEW CHARTSETS", color: "#bba4ff" },
  { bit: 1 << 3, label: "MANAGE CHARTSETS", color: "#ecd181" },
  { bit: 1 << 4, label: "VIEW ADMIN LOGS", color: "#9de4b8" },
  { bit: 1 << 5, label: "EDIT PRIVILEGES", color: "#ffa774" },
];

const statuses: Record<ChartsetStatus, { color: string; fill: string }> = {
  published: { color: "#18363b", fill: "#a4e1eb" },
  pending: { color: "#33234f", fill: "#c5b9ed" },
  approved: { color: "#163526", fill: "#9de4b8" },
  ranked: { color: "#493913", fill: "#f2d675" },
};

const origins: Record<ChartsetSummary["origin"], string> = {
  community: "#bdc5ce",
  official: "#73d9f7",
};

const statusActions: Record<string, ChartsetStatus | undefined> = {
  chartset_to_pending: "pending",
  chartset_to_published: "published",
  chartset_to_approved: "approved",
  chartset_to_ranked: "ranked",
};

const actionTags: Record<string, { label: string; color: string }> = {
  user_banned: { label: "USER BANNED", color: "#ff8f94" },
  user_unbanned: { label: "USER UNBANNED", color: "#9de4b8" },
  user_updated: { label: "USER UPDATED", color: "#87d8dc" },
  user_groups_updated: { label: "GROUPS UPDATED", color: "#c6a5ff" },
  user_privileges_updated: { label: "PRIVILEGES UPDATED", color: "#ffa774" },
  chartset_uploaded: { label: "CHARTSET UPLOADED", color: "#7cb9ff" },
  chartset_deleted: { label: "CHARTSET DELETED", color: "#ff8f94" },
  chartset_restored: { label: "CHARTSET RESTORED", color: "#9de4b8" },
};

function Tag({ label, color, fill, compact = false, className = "", title, onClick, pressed, disabled }: {
  label: string;
  color: string;
  fill?: string;
  compact?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
}) {
  const props = {
    className: `admin-profile-tag${fill ? " admin-tag--filled" : ""}${compact ? " admin-tag--compact" : ""}${onClick ? " admin-profile-tag--interactive" : ""}${className ? ` ${className}` : ""}`,
    title,
    style: { color, borderColor: `${color}66`, backgroundColor: fill ?? `${color}1f` },
  };
  return onClick ? <button {...props} type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick}>{label}</button>
    : <span {...props}>{label}</span>;
}

type FlagTagProps = { flags: number; partitioned?: boolean; onChange?: (flags: number) => void; disabled?: boolean };

function FlagTags({ flags, options, partitioned = false, onChange, disabled, requiredBits = 0 }: FlagTagProps & { options: readonly AccessFlag[]; requiredBits?: number }) {
  const active = options.filter(({ bit }) => (flags & bit) !== 0);
  const inactive = options.filter(({ bit }) => (flags & bit) === 0);
  const empty = [{ bit: 0, label: "NONE", color: "#a7a2bf" }];
  function renderTag({ bit, label, color }: AccessFlag) {
    const locked = (requiredBits & bit) !== 0 && (flags & bit) !== 0;
    return <Tag key={label} label={label} color={color} pressed={(flags & bit) !== 0} disabled={disabled || locked}
      className={onChange && locked ? "admin-profile-tag--locked" : undefined} title={onChange && locked ? `${label} is required` : undefined}
      onClick={onChange && bit ? () => { if (!locked) onChange(flags ^ bit); } : undefined} />;
  }
  return <>
    <div className="admin-profile-tags" role={partitioned ? "group" : undefined} aria-label={partitioned ? "Included" : undefined}>
      {(active.length ? active : empty).map(renderTag)}
    </div>
    {partitioned && <>
      <hr className="admin-profile-tags__divider" />
      <div className="admin-profile-tags admin-profile-tags--excluded" role="group" aria-label="Not included">
        {(inactive.length ? inactive : empty).map(renderTag)}
      </div>
    </>}
  </>;
}

export function GroupTags(props: FlagTagProps) {
  return <FlagTags {...props} options={groups} requiredBits={1} />;
}

export function PrivilegeTags(props: FlagTagProps) {
  return <FlagTags {...props} options={privileges} />;
}

export function formatPermissionError(cause: unknown, fallback: string) {
  if (cause instanceof PermissionError) return <div className="admin-required-permission">
    <span>{cause.message}</span>
    {cause.required === "super" ? <Tag label="SUPER ADMIN" color="#f2d675" />
      : <PrivilegeTags flags={cause.required} />}
  </div>;
  return cause instanceof Error ? cause.message : fallback;
}

export function ChartsetStatusTag({ status, className, title, compact = true }: {
  status: ChartsetStatus;
  className?: string;
  title?: string;
  compact?: boolean;
}) {
  return <Tag label={status.toUpperCase()} {...statuses[status]} compact={compact} className={className} title={title} />;
}

export function ChartsetOriginTag({ origin, className }: {
  origin: ChartsetSummary["origin"];
  className?: string;
}) {
  return <Tag label={origin.toUpperCase()} color={origins[origin]} fill="#111920b3" compact className={className} />;
}

export function ChartsetStatusTransition({ previousStatus, newStatus }: {
  previousStatus: unknown;
  newStatus: unknown;
}) {
  if (typeof previousStatus !== "string" || !Object.hasOwn(statuses, previousStatus)
    || typeof newStatus !== "string" || !Object.hasOwn(statuses, newStatus)) return null;
  return <div className="admin-action-logs__transition" aria-label={`Status changed from ${previousStatus} to ${newStatus}`}>
    <ChartsetStatusTag status={previousStatus as ChartsetStatus} />
    <span aria-hidden="true">→</span>
    <ChartsetStatusTag status={newStatus as ChartsetStatus} />
  </div>;
}

export function ActionLogTag({ action }: { action: string }) {
  const title = action.replaceAll("_", " ").toUpperCase();
  const status = statusActions[action];
  if (status) return <ChartsetStatusTag status={status} className="admin-action-logs__action" title={title} compact={false} />;
  const { label, color } = actionTags[action] ?? { label: title, color: "#a7a2bf" };
  return <Tag label={label} color={color} className="admin-action-logs__action" title={title} />;
}
