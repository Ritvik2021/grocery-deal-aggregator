import type { CategoryGroup } from '../api/client';

interface CategoryFilterProps {
  categories: CategoryGroup[];
  selectedL1s: string[];
  selectedL2s: string[];
  onToggleL1: (l1: string) => void;
  onToggleL2: (l2: string) => void;
}

export function CategoryFilter({
  categories,
  selectedL1s,
  selectedL2s,
  onToggleL1,
  onToggleL2,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  // Only show L2s for the selected L1s
  const visibleL2s = categories
    .filter((g) => selectedL1s.includes(g.l1))
    .flatMap((g) => g.l2s);

  return (
    <div className="flex flex-col gap-2">
      {/* L1 row */}
      <div className="flex flex-wrap gap-2">
        {categories.map(({ l1 }) => {
          const active = selectedL1s.includes(l1);
          return (
            <button
              key={l1}
              onClick={() => onToggleL1(l1)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              {l1}
            </button>
          );
        })}
      </div>

      {/* L2 row — only visible when at least one L1 is selected and has subcategories */}
      {visibleL2s.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-brand-200">
          {visibleL2s.map((l2) => {
            const active = selectedL2s.includes(l2);
            return (
              <button
                key={l2}
                onClick={() => onToggleL2(l2)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {l2}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
