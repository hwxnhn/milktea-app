import { Plus } from 'lucide-react';

export default function ProductCard({ product, onSelect }) {
  const isAvailable = product.TRANG_THAI_MON !== false;

  return (
    <div
      onClick={() => isAvailable && onSelect(product)}
      className={`bg-white border border-[#d5c3b6]/60 p-3 rounded-xl flex gap-4 transition-all ${
        isAvailable ? 'hover:shadow-md cursor-pointer' : 'opacity-60 grayscale cursor-not-allowed'
      }`}
    >
      {/* Hình ảnh sản phẩm */}
      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-100">
        <img
          src={
            product.HINH_ANH ||
            'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300'
          }
          alt={product.TEN_SP}
          className="w-full h-full object-cover"
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-600 rounded">
              Hết món
            </span>
          </div>
        )}
      </div>

      {/* Thông tin tên & giá */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm text-[#1a1c1c] line-clamp-1">
            {product.TEN_SP}
          </h3>
          <p className="text-xs text-[#51443a] mt-1 line-clamp-2">
            {product.DANH_MUC || 'Trà sữa thơm ngon đậm vị'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-sm text-[#873e23]">
            {Number(product.GIA_BAN || 0).toLocaleString('vi-VN')} đ
          </span>
          <button
            type="button"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              if (isAvailable) onSelect(product);
            }}
            className="bg-[#873e23] text-white w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm disabled:bg-gray-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}