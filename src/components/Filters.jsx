import { REASONS, SORT_OPTIONS, STATUSES } from '@/lib/constants';
import { btnSecondary, inputClass } from './styles';
import { SearchIcon } from './Icons';

export default function Filters({ searchText, onSearchText, filters, onChange, onClear }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={searchText}
          onChange={(event) => onSearchText(event.target.value)}
          placeholder="Search name, order or reference"
          aria-label="Search requests"
          className={`${inputClass} pl-9`}
        />
      </div>
      <select value={filters.status} onChange={(e) => onChange({ status: e.target.value, page: 1 })} aria-label="Filter by status" className={inputClass}>
        <option value="">All statuses</option>
        {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <select value={filters.reason} onChange={(e) => onChange({ reason: e.target.value, page: 1 })} aria-label="Filter by return reason" className={inputClass}>
        <option value="">All reasons</option>
        {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
      </select>
      <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value, page: 1 })} aria-label="Sort requests" className={inputClass}>
        {Object.entries(SORT_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" onClick={onClear} className={btnSecondary}>Clear</button>
    </div>
  );
}
