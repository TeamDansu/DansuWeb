import type { UserDetail } from "./userTypes";
import type { UserProfileData } from "./UserProfile";
import { readPermissionError } from "./adminPermissions";

export async function fetchUserProfile(userId: string | number, signal: AbortSignal): Promise<UserProfileData> {
  const response = await fetch(`/api/v1/admin/users/${userId}/profile`, {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    const body: { detail?: unknown } | null = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `Unable to load user profile (${response.status}).`);
  }
  return response.json() as Promise<UserProfileData>;
}

export async function fetchUserDetail(userId: string | number, signal: AbortSignal): Promise<UserDetail> {
  const response = await fetch(`/api/v1/admin/users/${userId}`, {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    const fallback = response.status === 404 ? "User not found."
      : response.status === 401 ? "Your session expired. Sign in again."
      : response.status === 403 ? "You do not have permission to view this user."
      : `Unable to load user (${response.status}).`;
    throw await readPermissionError(response, fallback, 1);
  }
  return response.json() as Promise<UserDetail>;
}
