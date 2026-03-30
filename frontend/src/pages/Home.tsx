import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStores, fetchDeals, fetchCategories, triggerRefresh } from '../api/client';
import { StoreFilter } from '../components/StoreFilter';
import { CategoryFilter } from '../components/CategoryFilter';
import { SearchBar } from '../components/SearchBar';
import { DealCard } from '../components/DealCard';
import { DealCardSkeleton } from '../components/DealCardSkeleton';

const PAGE_SIZE = 48;

type RefreshStatus = 'idle' | 'fetching' | 'success' | 'error' | 'busy';

interface BannerState {
  status: RefreshStatus;
  message: string;
}

export function Home() {
  const [selectedStores, setSelectedStores]     = useState<string[]>([]);
  const [selectedL1s, setSelectedL1s]           = useState<string[]>([]);
  const [selectedL2s, setSelectedL2s]           = useState<string[]>([]);
  const [search, setSearch]                     = useState('');
  const [page, setPage]                         = useState(0);
  const [refreshStatus, setRefreshStatus]       = useState<RefreshStatus>('idle');
  const [banner, setBanner]                     = useState<BannerState | null>(null);
  const queryClient = useQueryClient();

  // Auto-dismiss banner after 5s on success/error
  useEffect(() => {
    if (banner?.status === 'success' || banner?.status === 'error') {
      const t = setTimeout(() => setBanner(null), 5_000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  const handleToggleStore = useCallback((slug: string) => {
    setSelectedStores((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setPage(0);
  }, []);

  const handleToggleL1 = useCallback((l1: string) => {
    setSelectedL1s((prev) => {
      const next = prev.includes(l1) ? prev.filter((v) => v !== l1) : [...prev, l1];
      // Drop any L2s whose parent L1 is no longer selected — done via effect below
      return next;
    });
    setPage(0);
  }, []);

  // When L1 selection changes, prune L2s that no longer have a selected parent
  const handleToggleL2 = useCallback((l2: string) => {
    setSelectedL2s((prev) =>
      prev.includes(l2) ? prev.filter((v) => v !== l2) : [...prev, l2]
    );
    setPage(0);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(0);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshStatus === 'fetching') return;
    setRefreshStatus('fetching');
    setBanner({ status: 'fetching', message: 'Fetching deals from Flipp — this takes ~30 seconds…' });

    const result = await triggerRefresh();

    if (result.success) {
      setRefreshStatus('success');
      setBanner({ status: 'success', message: '✓ Deals updated! Loading new listings…' });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } else if (result.message?.includes('already')) {
      setRefreshStatus('busy');
      setBanner({ status: 'busy', message: result.message ?? 'A refresh is already running' });
    } else {
      setRefreshStatus('error');
      setBanner({ status: 'error', message: `✗ Refresh failed: ${result.error ?? 'Unknown error'}` });
    }

    setTimeout(() => setRefreshStatus('idle'), 4_000);
  }, [refreshStatus, queryClient]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });

  const { data: dealsData, isLoading, isError } = useQuery({
    queryKey: ['deals', selectedStores, selectedL1s, selectedL2s, search, page],
    queryFn: () =>
      fetchDeals({
        stores:  selectedStores.length ? selectedStores : undefined,
        l1:      selectedL1s.length    ? selectedL1s    : undefined,
        l2:      selectedL2s.length    ? selectedL2s    : undefined,
        search:  search || undefined,
        limit:   PAGE_SIZE,
        offset:  page * PAGE_SIZE,
      }),
    staleTime: 2 * 60 * 1000,
  });

  // Prune L2s whose parent L1 was deselected
  useEffect(() => {
    if (selectedL2s.length === 0) return;
    const availableL2s = categories
      .filter((g) => selectedL1s.includes(g.l1))
      .flatMap((g) => g.l2s);
    const pruned = selectedL2s.filter((l2) => availableL2s.includes(l2));
    if (pruned.length !== selectedL2s.length) setSelectedL2s(pruned);
  }, [selectedL1s, categories, selectedL2s]);

  const deals      = dealsData?.deals ?? [];
  const total      = dealsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const lastUpdated = deals[0]?.fetched_at
    ? new Date(deals[0].fetched_at).toLocaleDateString('en-CA', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const buttonLabel: Record<RefreshStatus, string> = {
    idle:     '↻ Refresh deals',
    fetching: '⟳ Fetching…',
    success:  '✓ Updated',
    error:    '✗ Failed',
    busy:     '⟳ In progress',
  };
  const buttonClass: Record<RefreshStatus, string> = {
    idle:     'bg-white text-gray-700 border border-gray-200 hover:border-brand-500 hover:text-brand-700',
    fetching: 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed',
    success:  'bg-green-50 text-green-700 border border-green-300',
    error:    'bg-red-50 text-red-700 border border-red-300',
    busy:     'bg-yellow-50 text-yellow-700 border border-yellow-300',
  };
  const bannerStyle: Record<RefreshStatus, string> = {
    idle:     '',
    fetching: 'bg-blue-50 border-blue-200 text-blue-800',
    success:  'bg-green-50 border-green-200 text-green-800',
    error:    'bg-red-50 border-red-200 text-red-800',
    busy:     'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const activeFilterCount = selectedStores.length + selectedL1s.length + selectedL2s.length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🛒</span>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">
              Canadian Grocery Deals
            </span>
          </div>
          <SearchBar value={search} onChange={handleSearch} />
          <button
            onClick={handleRefresh}
            disabled={refreshStatus === 'fetching'}
            className={`shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${buttonClass[refreshStatus]}`}
          >
            {buttonLabel[refreshStatus]}
          </button>
        </div>

        {refreshStatus === 'fetching' && (
          <div className="h-1 w-full bg-blue-100 overflow-hidden">
            <div className="h-1 bg-blue-500"
                 style={{ width: '40%', animation: 'indeterminate 1.8s ease-in-out infinite' }} />
          </div>
        )}
      </header>

      {banner && (
        <div className={`border-b text-sm text-center py-2 px-4 transition-all ${bannerStyle[banner.status]}`}>
          {banner.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <section className="mb-6 flex flex-col gap-3">
          <StoreFilter stores={stores} selectedStores={selectedStores} onToggle={handleToggleStore} />
          <CategoryFilter
            categories={categories}
            selectedL1s={selectedL1s}
            selectedL2s={selectedL2s}
            onToggleL1={handleToggleL1}
            onToggleL2={handleToggleL2}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSelectedStores([]); setSelectedL1s([]); setSelectedL2s([]); setPage(0); }}
              className="self-start text-xs text-gray-400 hover:text-red-500 underline underline-offset-2"
            >
              Clear all filters ({activeFilterCount})
            </button>
          )}
        </section>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {isLoading ? 'Loading deals…' : isError ? 'Failed to load deals' : (
              <>
                <span className="font-semibold text-gray-900">{total}</span> deals found
                {selectedStores.length === 1 && ` at ${stores.find((s) => s.slug === selectedStores[0])?.name}`}
                {selectedStores.length > 1 && ` across ${selectedStores.length} stores`}
                {search && ` matching "${search}"`}
              </>
            )}
          </p>
          {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated}</p>}
        </div>

        {/* Deal grid */}
        {isError ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-gray-600 font-medium">Could not load deals</p>
            <p className="text-gray-400 text-sm mt-1">
              Check the backend terminal — usually a database connection issue (wrong{' '}
              <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code>).
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => <DealCardSkeleton key={i} />)}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏪</p>
            <p className="text-gray-600 font-medium">No deals found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? 'Try a different search term' : 'Hit "↻ Refresh deals" to fetch the latest flyers'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {deals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%) scaleX(0.5); }
          50%  { transform: translateX(60%)   scaleX(1.2); }
          100% { transform: translateX(250%)  scaleX(0.5); }
        }
      `}</style>
    </div>
  );
}
