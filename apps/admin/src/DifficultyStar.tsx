import type { CSSProperties } from "react";
export default function DifficultyStar({ color }: { color: string }) {
  return (
    <span className="difficulty-star" aria-hidden="true"
      style={{ "--difficulty-color": color } as CSSProperties} />
  );
}
