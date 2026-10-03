import { Link } from "react-router";
import SteamProfileLink from "./SteamProfileLink";
import type { UserDetail } from "./userTypes";

export type UserProfileData = Pick<UserDetail,
  "id" | "username" | "steam_persona_name" | "steam_profile_url" | "account_status" | "avatar_url" | "country_code"
>;

export default function UserProfile({ user, linkToDetail = false }: {
  user: UserProfileData;
  linkToDetail?: boolean;
}) {
  const name = user.username;
  return <div className="user-profile">
    <div className="user-profile__avatar" aria-label={`${name}'s avatar`}>
      <span aria-hidden="true">{name.charAt(0)}</span>
      {user.avatar_url && <img key={user.avatar_url} src={user.avatar_url} alt=""
        onError={event => { event.currentTarget.style.display = "none"; }} />}
    </div>
    <div className="user-profile__identity">
      <strong title={name}>{linkToDetail
        ? <Link to={`/users/${user.id}`}>{name}</Link> : name}</strong>
      <SteamProfileLink name={user.steam_persona_name} profileUrl={user.steam_profile_url} className="user-profile__steam-name" />
      <span className="user-profile__country">
        {user.country_code && /^[a-z]{2}$/i.test(user.country_code) && (
          <img key={user.country_code} src={`https://flagcdn.com/28x21/${user.country_code.toLowerCase()}.png`}
            width={20} height={15} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />
        )}
        {user.country_code || "—"}
        <span className={`admin-users__status admin-users__status--${user.account_status}`}>
          {user.account_status.toUpperCase()}
        </span>
      </span>
    </div>
  </div>;
}
