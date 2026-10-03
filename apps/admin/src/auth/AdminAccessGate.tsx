import { useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";

type AccessStatus = "allowed" | "login_required" | "forbidden" | "error";
type AccessResult = { pathname: string; status: AccessStatus };
export type BrowserProfile = {
  steam_persona_name: string;
  username: string;
  avatar_url: string | null;
  groups: number;
  privileges: number;
};
export type BrowserProfileContext = {
  profile: BrowserProfile | null;
  profileError: boolean;
  checkingAccess: boolean;
  updateProfileAccess: (user: Pick<BrowserProfile, "username" | "groups" | "privileges">) => void;
};

function AccessScreen({
  label,
  title,
  description,
  children,
  login = false,
}: {
  label?: string;
  title?: string;
  description: string;
  children?: ReactNode;
  login?: boolean;
}) {
  return (
    <main className="access-screen">
      <section className={`access-screen__panel${login ? " access-screen__panel--login" : ""}`}>
        <span className="admin-brand"><span className="admin-brand__wordmark">DANSU ADMIN</span></span>
        {label && <span className="access-screen__label">{label}</span>}
        {title && <h1>{title}<span className="heading-period">.</span></h1>}
        <p className="access-screen__description">{description}</p>
        {children}
      </section>
    </main>
  );
}

export default function AdminAccessGate() {
  const { pathname } = useLocation();
  const adminPath = `/admin${pathname}`;
  const requestedPath = useRef<string | null>(null);
  const requestId = useRef(0);
  const profileRequested = useRef(false);
  const [result, setResult] = useState<AccessResult | null>(null);
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (requestedPath.current === pathname) return;
    requestedPath.current = pathname;
    const currentRequestId = ++requestId.current;

    async function checkAccess() {
      let status: AccessStatus;
      try {
        const response = await fetch("/api/v1/admin/access", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_path: adminPath }),
        });
        switch (response.status) {
          case 204:
            status = "allowed";
            break;
          case 401:
            status = "login_required";
            break;
          case 403:
            status = "forbidden";
            break;
          default:
            status = "error";
        }
      } catch {
        status = "error";
      }

      if (requestId.current === currentRequestId) {
        setResult({ pathname, status });
      }
    }

    void checkAccess();
  }, [adminPath, pathname]);

  useEffect(() => {
    if (result?.status !== "allowed" || profileRequested.current) return;
    profileRequested.current = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Profile request failed");
        setProfile((await response.json()) as BrowserProfile);
      } catch {
        setProfileError(true);
      }
    }

    void loadProfile();
  }, [result?.status]);

  const checkingAccess = result?.pathname !== pathname;

  // Keep the shell mounted during navigation, but gate each page until access is confirmed.
  if (checkingAccess && result?.status !== "allowed") {
    return (
      <AccessScreen label="CHECKING ACCESS" title="Checking access" description="Verifying your admin permissions." />
    );
  }

  if (result?.status === "login_required") {
    const loginUrl = `/api/v1/auth/steam/login?${new URLSearchParams({
      redirect_to: adminPath,
    })}`;
    return (
      <AccessScreen login description="Sign in with your Steam account to access the admin console.">
        <a className="access-screen__button" href={loginUrl}>Sign in with Steam</a>
      </AccessScreen>
    );
  }

  if (result?.status === "forbidden") {
    return <AccessScreen label="ACCESS DENIED" title="Access denied" description="Your account does not have permission to view this page." />;
  }

  if (result?.status === "error") {
    return (
      <AccessScreen label="CONNECTION ERROR" title="Unable to verify access" description="Please try again in a moment.">
        <button className="access-screen__button" type="button" onClick={() => window.location.reload()}>Try again <span aria-hidden="true">↗</span></button>
      </AccessScreen>
    );
  }

  function updateProfileAccess(user: Pick<BrowserProfile, "username" | "groups" | "privileges">) {
    setProfile(current => current?.username === user.username
      ? { ...current, groups: user.groups, privileges: user.privileges } : current);
  }

  return <Outlet context={{ profile, profileError, checkingAccess, updateProfileAccess } satisfies BrowserProfileContext} />;
}
