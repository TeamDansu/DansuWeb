type PaginationProps = {
  page: number;
  displayPage?: number;
  totalPages: number;
  loading: boolean;
  label: string;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page, displayPage = page, totalPages, loading, label, onPageChange,
}: PaginationProps) {
  return (
    <nav className="admin-users__pagination" aria-label={label}>
      <button type="button" aria-label="Previous page" disabled={loading || page <= 1}
        onClick={() => onPageChange(page - 1)}>&lt;</button>
      <span>{displayPage} / {Math.max(totalPages, 1)}</span>
      <button type="button" aria-label="Next page" disabled={loading || page >= totalPages}
        onClick={() => onPageChange(page + 1)}>&gt;</button>
    </nav>
  );
}
