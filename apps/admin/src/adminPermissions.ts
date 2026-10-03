export type ActionTab = "users" | "chartsets" | "status" | "access";
export type ActionPermissions = { privileges: number };

export class PermissionError extends Error {
  required: number | "super";
  constructor(required: number | "super") {
    super("Required permission:");
    this.required = required;
  }
}

export async function readPermissionError(response: Response, fallback: string, required: number | "super"): Promise<Error> {
  const body: { detail?: unknown } | null = await response.json().catch(() => null);
  const detail = body?.detail;
  if (response.status === 403 && (detail === "Permission denied" || detail === "Super admin access required")) {
    return new PermissionError(detail === "Super admin access required" ? "super" : required);
  }
  // Keep bans, expired sessions, validation failures and other errors unchanged.
  return new Error(typeof detail === "string" ? detail : fallback);
}

export function hasActionPrivilege(profile: ActionPermissions | null, privilege: number): boolean {
  return !!profile && (profile.privileges & privilege) === privilege;
}

export function getActionTabs(profile: ActionPermissions | null): ActionTab[] {
  const tabs: ActionTab[] = [];
  if (hasActionPrivilege(profile, 1)) tabs.push("users"); // BAN_USERS
  // Chartset lookup requires REVIEW_CHARTSETS as well as the mutation privilege.
  if (hasActionPrivilege(profile, 4 | 8)) tabs.push("chartsets");
  if (hasActionPrivilege(profile, 4)) tabs.push("status"); // REVIEW_CHARTSETS
  tabs.push("access"); // Visibility only; the API still requires super admin to save access changes.
  return tabs;
}
