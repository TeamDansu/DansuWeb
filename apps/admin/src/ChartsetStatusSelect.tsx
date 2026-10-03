import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { ChartsetStatus } from "./chartTypes";
import { ChartsetStatusTag } from "./Tags";

export default function ChartsetStatusSelect({ options, value, disabled, onChange }: {
  options: readonly ChartsetStatus[];
  value: ChartsetStatus | "";
  disabled: boolean;
  onChange: (value: ChartsetStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    optionRefs.current[Math.max(0, options.findIndex(option => option === value))]?.focus();
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, options, value]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const index = optionRefs.current.findIndex(option => option === document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      optionRefs.current[next]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="admin-status-select" onKeyDown={navigate}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={triggerRef} type="button" className="admin-status-select__trigger" aria-label="New chartset status"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={() => setOpen(!open)}>
        {value ? <ChartsetStatusTag status={value} className="admin-status-select__tag" />
          : <span className="admin-profile-tag admin-tag--compact admin-status-select__placeholder">{options.length ? "SELECT STATUS" : "NO CHANGES"}</span>}
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && <div id={listId} className="admin-status-select__options" role="listbox" aria-label="Available chartset statuses">
        {options.map((status, index) => (
          <button key={status} ref={element => { optionRefs.current[index] = element; }} type="button" role="option"
            aria-selected={value === status} tabIndex={-1} className="admin-status-select__option"
            onClick={() => { onChange(status); close(); }}>
            <ChartsetStatusTag status={status} className="admin-status-select__tag" />
          </button>
        ))}
      </div>}
    </div>
  );
}
