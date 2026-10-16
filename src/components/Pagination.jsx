import { PAGE_SIZES } from '@/lib/constants';
import { btnSecondary } from './styles';

export default function Pagination({ pagination, onPageChange, onPageSizeChange }) {
  const { page, page_size: pageSize, total, total_pages: totalPages } = pagination;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
      <p>Showing {first}–{last} of {total} requests</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          Rows
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm">
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span>Page {page} of {Math.max(totalPages, 1)}</span>
        <button type="button" className={btnSecondary} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
