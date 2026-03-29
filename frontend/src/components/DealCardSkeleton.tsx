export function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-40" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded-full w-24" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="mt-2 h-6 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}
