import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import DifficultyStar from "./DifficultyStar";
import type { ChartDifficulty } from "./chartTypes";
import { getDifficultyAppearance } from "./difficultyColors";

export default function DifficultyPreview({ charts, to }: { charts: ChartDifficulty[]; to?: string }) {
  const difficulties = useMemo(() => charts.map(chart => ({
    ...chart,
    ...getDifficultyAppearance(chart.rating),
    originalRating: chart.rating,
  })), [charts]);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const popupId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const close = useCallback(() => {
    cancelClose();
    setOpen(false);
    setPosition(null);
  }, [cancelClose]);

  function show() {
    cancelClose();
    setOpen(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(close, 120);
  }

  useEffect(() => cancelClose, [cancelClose]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popupRef.current) return;
    const anchor = triggerRef.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const left = Math.max(10, Math.min(anchor.left, window.innerWidth - popup.width - 10));
    const below = anchor.bottom + 6;
    const top = below + popup.height <= window.innerHeight - 10
      ? below : Math.max(10, anchor.top - popup.height - 6);
    setPosition({ left, top });
  }, [open, charts]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && popupRef.current?.contains(event.target)) return;
      close();
    }
    function outsideClick(event: PointerEvent) {
      if (event.target instanceof Node && (
        triggerRef.current?.contains(event.target) || popupRef.current?.contains(event.target)
      )) return;
      close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", outsideClick);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", outsideClick);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);

  if (!charts.length) return <span className="admin-chartset-card__difficulties" aria-hidden="true" />;

  const triggerProps = {
    ref: (node: HTMLButtonElement | HTMLAnchorElement | null) => { triggerRef.current = node; },
    className: "admin-chartset-card__difficulties",
    "aria-label": to ? `View chartset with ${charts.length} chart difficulties` : `View ${charts.length} chart difficulties`,
    "aria-describedby": open ? popupId : undefined,
    onMouseEnter: show, onMouseLeave: scheduleClose, onFocus: show, onBlur: scheduleClose,
    style: { "--difficulty-count": charts.length } as CSSProperties,
  };
  const stars = difficulties.map((chart, index) => (
    <span key={chart.id} className="difficulty-preview__stack-item" aria-hidden="true" style={{
      "--difficulty-tilt": `${charts.length > 1 ? -8 + (16 * index) / (charts.length - 1) : 0}deg`,
    } as CSSProperties}>
      <DifficultyStar color={chart.color} />
    </span>
  ));

  return (
    <>
      {to ? <Link {...triggerProps} to={to}>{stars}</Link>
        : <button {...triggerProps} type="button" onClick={show}>{stars}</button>}
      {open && createPortal(
        <div ref={popupRef} id={popupId} role="tooltip" className="difficulty-preview__popup"
          onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
          style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}>
          <ul>
            {difficulties.map(chart => (
              <li key={chart.id}>
                <span className="difficulty-preview__badge" style={{
                  backgroundColor: chart.color, color: chart.textColor,
                }} title={chart.originalRating}>
                  <span><DifficultyStar color={chart.textColor} /></span>
                  <span>{chart.rating.toFixed(2)}</span>
                </span>
                <span className="difficulty-preview__name" title={chart.difficulty_name}>{chart.difficulty_name}</span>
              </li>
            ))}
          </ul>
        </div>, document.body,
      )}
    </>
  );
}
