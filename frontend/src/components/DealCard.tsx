import type { Deal } from '../api/client';

const STORE_COLORS: Record<string, string> = {
  walmart: 'bg-blue-100 text-blue-800',
  'real-canadian-superstore': 'bg-red-100 text-red-800',
  'no-frills': 'bg-yellow-100 text-yellow-800',
  'save-on-foods': 'bg-green-100 text-green-800',
  costco: 'bg-blue-100 text-blue-800',
};

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const storeBadgeClass =
    STORE_COLORS[deal.store_slug] || 'bg-gray-100 text-gray-700';

  const savingsPct = deal.savings_pct ? Math.round(deal.savings_pct) : null;

  const validUntil = deal.valid_to
    ? new Date(deal.valid_to).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative bg-gray-100 h-40 flex items-center justify-center overflow-hidden">
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.name}
            className="object-contain h-full w-full p-2"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-4xl">🛒</span>
        )}
        {/* Savings badge */}
        {savingsPct !== null && savingsPct > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{savingsPct}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {/* Store badge */}
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${storeBadgeClass}`}
        >
          {deal.store_name}
        </span>

        {/* Name */}
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {deal.name}
        </p>

        {/* Unit size */}
        {deal.unit_size && (
          <p className="text-xs text-gray-500">{deal.unit_size}</p>
        )}

        {/* Pricing */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          {deal.current_price !== null ? (
            <>
              <span className="text-lg font-bold text-gray-900">
                ${Number(deal.current_price).toFixed(2)}
              </span>
              {deal.original_price !== null &&
                Number(deal.original_price) > Number(deal.current_price) && (
                  <span className="text-sm text-gray-400 line-through">
                    ${Number(deal.original_price).toFixed(2)}
                  </span>
                )}
              {deal.savings !== null && Number(deal.savings) > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  Save ${Number(deal.savings).toFixed(2)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500 italic">See flyer</span>
          )}
        </div>

        {/* Valid until */}
        {validUntil && (
          <p className="text-xs text-gray-400 mt-1">Valid until {validUntil}</p>
        )}
      </div>
    </div>
  );
}
