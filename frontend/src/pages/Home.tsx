import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStores, fetchDeals } from '../api/client';
import { StoreFilter } from '../components/StoreFilter';
import { SearchBar } from '../components/SearchBar';
import { DealCard } from '../components/DealCard';
import { DealCardSkeleton } from '../components/DealCardSkeleton';

const PAGE_SIZE = 48;

export function Home() {
  const [selectedStore, setSelectedStore] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Reset to page 0 when filters change
  const handleStoreSelect = useCallback((slug: string) => {
    setSelectedStore(slug);
    setPage(0);
  }, []);
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(0);
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: dealsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['deals', selectedStore, search, page],
    queryFn: () =>
      fetchDeals({
        store: selectedStore || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const deals = dealsData?.deals ?? [];
  const total = dealsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Last updated: most recent fetched_at across visible deals
  const lastUpdated = deals[0]?.fetched_at
    ? new Date(deals[0].fetched_at).toLocaleDateString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Store filter */}
        <section className="mb-6">
          <StoreFilter
            stores={stores}
            selectedStore={selectedStore}
            onSelect={handleStoreSelect}
          />
        </section>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {isLoading ? (
              'Loading deals…'
            ) : isError ? (
              'Failed to load deals'
            ) : (
              <>
                <span className="font-semibold text-gray-900">{total}</span>{' '}
                deals found
                {selectedStore &&
                  ` at ${stores.find((s) => s.slug === selectedStore)?.name}`}
                {search && ` matching "${search}"`}
              </>
            )}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400">Updated {lastUpdated}</p>
          )}
        </div>

        {/* Deal grid */}
        {isError ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-gray-600 font-medium">Could not load deals</p>
            <p className="text-gray-400 text-sm mt-1">
              Check the backend terminal for errors — this is usually a database
              connection issue (wrong <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code>).
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏪</p>
            <p className="text-gray-600 font-medium">No deals found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search
                ? 'Try a different search term'
                : 'Trigger a data refresh to populate deals'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
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
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
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
    </div>
  );
}
