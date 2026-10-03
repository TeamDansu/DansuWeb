import steamIcon from "./assets/steam.svg";

type SteamProfileLinkProps = {
  name: string;
  profileUrl: string | null;
  className?: string;
};

export default function SteamProfileLink({ name, profileUrl, className = "" }: SteamProfileLinkProps) {
  const displayName = name || (profileUrl ? "Steam Profile" : "—");

  return (
    <span className={`steam-profile-link ${className}`}>
      <img className="steam-profile-link__icon" src={steamIcon} alt="" aria-hidden="true" />
      {profileUrl ? (
        <a className="steam-profile-link__name" href={profileUrl} title={displayName} target="_blank" rel="noopener noreferrer">
          {displayName}
        </a>
      ) : <span className="steam-profile-link__name" title={displayName}>{displayName}</span>}
    </span>
  );
}
