import { useRef, useState } from "react";
import { GroupTags, PrivilegeTags } from "./Tags";
import AdminButton from "./AdminButton";
import type { BrowserProfile } from "./auth/AdminAccessGate";

export default function ProfileMenu({ profile }: { profile: BrowserProfile }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) {
        const body: { detail?: unknown } | null = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to log out. Please try again.");
      }
      window.location.replace("/admin/");
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : "Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <details ref={detailsRef} className={`admin-topbar__account${isClosing ? " is-closing" : ""}`}>
      <summary
        className="admin-topbar__profile"
        aria-label="Show account groups and privileges"
        onClick={(event) => {
          if (!detailsRef.current?.open) return;
          event.preventDefault();
          if (isClosing) {
            setIsClosing(false);
          } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            detailsRef.current.open = false;
          } else {
            setIsClosing(true);
          }
        }}
      >
        <span className="admin-topbar__avatar" aria-hidden="true">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            profile.steam_persona_name.trim().charAt(0) || "?"
          )}
        </span>
        <span className="admin-topbar__profile-copy">
          <strong>{profile.username}</strong>
          <small>{profile.steam_persona_name}</small>
        </span>
        <span className="admin-topbar__profile-toggle" aria-hidden="true">
          <span className="admin-topbar__profile-toggle-down">⌄</span>
          <span className="admin-topbar__profile-toggle-up">⌃</span>
        </span>
      </summary>
      <div
        className="admin-topbar__access-panel"
        onAnimationEnd={(event) => {
          if (isClosing && event.animationName === "profile-panel-exit") {
            if (detailsRef.current) detailsRef.current.open = false;
            setIsClosing(false);
          }
        }}
      >
        <section>
          <h2>GROUPS</h2>
          <GroupTags flags={profile.groups} />
        </section>
        <section>
          <h2>PRIVILEGES</h2>
          <PrivilegeTags flags={profile.privileges} />
        </section>
        <div className="admin-topbar__logout-actions">
          <AdminButton className="admin-topbar__logout" size="small" tone="danger" disabled={loggingOut} onClick={logout}>
            {loggingOut ? "LOGGING OUT..." : "LOG OUT"}
          </AdminButton>
          {logoutError && <p className="admin-topbar__logout-error" role="alert">{logoutError}</p>}
        </div>
      </div>
    </details>
  );
}
