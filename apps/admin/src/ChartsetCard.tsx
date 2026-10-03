import { useState } from "react";
import { Link } from "react-router";
import type { ChartsetSummary } from "./chartTypes";
import DifficultyPreview from "./DifficultyPreview";
import { ChartsetStatusTag, ChartsetOriginTag } from "./Tags";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = Object.fromEntries(dateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export default function ChartsetCard({ chartset, as: Element = "article" }: {
  chartset: ChartsetSummary;
  as?: "article" | "li";
}) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const showCover = !chartset.is_removed && chartset.preview_cover_url
    && failedCoverUrl !== chartset.preview_cover_url;
  const coverFailed = () => setFailedCoverUrl(chartset.preview_cover_url);

  return (
    <Element className={`admin-chartset-card${chartset.is_removed ? " admin-chartset-card--removed" : ""}`}>
      <Link className="admin-chartset-card__link" to={`/chartsets/${chartset.id}`}
        aria-label={`View chartset ${chartset.title || chartset.id}`} />
      {showCover && <img className="admin-chartset-card__backdrop" src={chartset.preview_cover_url}
        alt="" loading="lazy" decoding="async" onError={coverFailed} />}
      <div className="admin-chartset-card__cover">
        {showCover && <img src={chartset.preview_cover_url} alt="" loading="lazy" decoding="async" onError={coverFailed} />}
        <span className="admin-chartset-card__id">#{chartset.id}</span>
      </div>
      <div className="admin-chartset-card__content">
        <div className="admin-chartset-card__heading">
          <h3 title={chartset.title ?? undefined}>{chartset.title || "Untitled chartset"}</h3>
          <ChartsetOriginTag origin={chartset.origin} className="admin-chartset-card__origin" />
        </div>
        <p className="admin-chartset-card__artist" title={chartset.artist ?? undefined}>
          {chartset.artist || "Unknown artist"}
        </p>
        <p className="admin-chartset-card__owner" title={chartset.owner_username ?? undefined}>
          <span>Owner </span>{chartset.owner_id != null && chartset.owner_username
            ? <Link to={`/users/${chartset.owner_id}`}>{chartset.owner_username}</Link>
            : chartset.owner_username || "Unknown"}
        </p>
        <div className="admin-chartset-card__details-row">
          <DifficultyPreview charts={chartset.charts} to={`/chartsets/${chartset.id}`} />
          <div className="admin-chartset-card__tags">
            {chartset.is_removed && <span className="admin-chartset-card__removed">REMOVED</span>}
            <ChartsetStatusTag status={chartset.status} className="admin-chartset-card__status" />
          </div>
        </div>
        <dl className="admin-chartset-card__dates">
          <div><dt>Created</dt><dd><time dateTime={chartset.created_at}>{formatDate(chartset.created_at)} KST</time></dd></div>
          <div><dt>Validated</dt><dd>{chartset.last_validated_at
            ? <time dateTime={chartset.last_validated_at}>{formatDate(chartset.last_validated_at)} KST</time>
            : "Not validated"}</dd></div>
        </dl>
      </div>
    </Element>
  );
}
