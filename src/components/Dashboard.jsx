'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Filters from './Filters';
import Modal from './Modal';
import Pagination from './Pagination';
import RequestDetails from './RequestDetails';
import RequestForm from './RequestForm';
import RequestTable from './RequestTable';
import Sidebar from './Sidebar';
import StatCard from './StatCard';
import { PlusIcon } from './Icons';
import { apiFetch } from '@/lib/client-api';
import { btnPrimary, btnSecondary } from './styles';

const DEFAULT_FILTERS = { search: '', status: '', reason: '', sort: 'newest', page: 1, pageSize: 10 };

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState(''); // what is typed; copied into filters after a short pause
  const [list, setList] = useState(null); // { items, pagination }
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null); // { type, text }
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const latestLoad = useRef(0);

  // Wait 300ms after typing stops before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      const text = searchText.trim();
      setFilters((current) => (current.search === text ? current : { ...current, search: text, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Hide the success/error banner after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Loads the table rows and the stat cards from the API
  const loadData = useCallback(async () => {
    const loadId = ++latestLoad.current; // lets us ignore out-of-date responses
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({
      page: String(filters.page),
      page_size: String(filters.pageSize),
      sort: filters.sort,
    });
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.reason) params.set('reason', filters.reason);

    try {
      const [listData, statsData] = await Promise.all([
        apiFetch(`/api/requests?${params.toString()}`),
        apiFetch('/api/stats'),
      ]);
      if (loadId !== latestLoad.current) return;
      setList(listData);
      setStats(statsData);
    } catch (error) {
      if (loadId === latestLoad.current) setLoadError(error.message);
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // If the last row on a page was removed, step back to the last page that still exists
  useEffect(() => {
    if (list && list.items.length === 0 && filters.page > 1) {
      setFilters((current) => ({ ...current, page: Math.max(1, list.pagination.total_pages) }));
    }
  }, [list, filters.page]);

  function updateFilters(changes) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  function clearFilters() {
    setSearchText('');
    setFilters((current) => ({ ...DEFAULT_FILTERS, pageSize: current.pageSize }));
  }

  function handleCreated(created) {
    setShowCreate(false);
    setNotice({ type: 'success', text: `Request ${created.reference_number} was created.` });
    clearFilters(); // reset filters so the new request is visible at the top (this also reloads the data)
  }

  async function createRequest(values) {
    const created = await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(values) });
    handleCreated(created);
  }

  // Called by the details window after any change
  function handleChanged(message) {
    if (message) setNotice({ type: 'success', text: message });
    loadData();
  }

  const hasFilters = Boolean(filters.search || filters.status || filters.reason);
  const items = list ? list.items : [];

  return (
    <div className="min-h-screen md:flex">
      <Sidebar onNewRequest={() => setShowCreate(true)} />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Return requests</h1>
            <p className="text-sm text-gray-600">Create, review and complete customer returns.</p>
          </div>
          <button type="button" className={btnPrimary} onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4" /> Create Request
          </button>
        </div>

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
          >
            {notice.text}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active requests" value={stats?.active} hint="Open, In Review and Approved" />
          <StatCard label="Open" value={stats?.open} hint="Waiting to be reviewed" />
          <StatCard label="In Review" value={stats?.in_review} hint="Being checked" />
          <StatCard label="Completed" value={stats?.completed} hint="Finished" />
        </div>

        <Filters searchText={searchText} onSearchText={setSearchText} filters={filters} onChange={updateFilters} onClear={clearFilters} />

        <div className="rounded-lg border border-gray-200 bg-white">
          {loadError ? (
            <div className="p-8 text-center">
              <p role="alert" className="text-sm text-red-700">{loadError}</p>
              <button type="button" className={`${btnSecondary} mt-4`} onClick={loadData}>Try again</button>
            </div>
          ) : !list ? (
            <p className="p-8 text-center text-sm text-gray-600">Loading requests…</p>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-600">
                {hasFilters ? 'No return requests match your search or filters.' : 'No return requests yet. Create the first one.'}
              </p>
              {hasFilters && <button type="button" className={`${btnSecondary} mt-4`} onClick={clearFilters}>Clear filters</button>}
            </div>
          ) : (
            <div className={loading ? 'opacity-60' : ''}>
              <RequestTable items={items} onView={setSelectedId} />
            </div>
          )}
          {list && !loadError && (
            <Pagination
              pagination={list.pagination}
              onPageChange={(page) => updateFilters({ page })}
              onPageSizeChange={(pageSize) => updateFilters({ pageSize, page: 1 })}
            />
          )}
        </div>
      </main>

      {showCreate && (
        <Modal title="Create return request" onClose={() => setShowCreate(false)}>
          <RequestForm submitLabel="Create request" onSubmit={createRequest} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {selectedId && (
        <RequestDetails requestId={selectedId} onClose={() => setSelectedId(null)} onChanged={handleChanged} />
      )}
    </div>
  );
}
