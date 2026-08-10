export default function CategoryFilter({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="mt-3 overflow-x-auto hide-scrollbar px-4">
      <div className="flex gap-2 pb-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-transform active:scale-95 ${
                isActive
                  ? 'bg-[#873e23] text-white shadow-sm'
                  : 'bg-[#e8e8e8] text-[#51443a] hover:bg-[#e2e2e2]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}