import type { Store } from '../api/client';

interface StoreFilterProps {
  stores: Store[];
  selectedStores: string[];
  onToggle: (slug: string) => void;
}

const STORE_EMOJI: Record<string, string> = {
  walmart: '🔵',
  'real-canadian-superstore': '🔴',
  'no-frills': '🟡',
  'save-on-foods': '🟢',
  costco: '🏪',
};

export function StoreFilter({ stores, selectedStores, onToggle }: StoreFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {stores.map((store) => {
        const active = selectedStores.includes(store.slug);
        return (
          <button
            key={store.slug}
            onClick={() => onToggle(store.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-brand-500 hover:text-brand-700'
            }`}
          >
            <span>{STORE_EMOJI[store.slug] || '🏬'}</span>
            <span>{store.name}</span>
            {store.deal_count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {store.deal_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
