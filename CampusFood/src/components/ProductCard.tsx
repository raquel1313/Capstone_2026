import { Plus } from 'lucide-react';

import Image from 'next/image';

import type { Product } from '@/data';

import { formatPrice } from '@/data';

export function ProductCard({
  product,
  addToCart,
}: {
  product: Product;
  addToCart: (product: Product) => void;
}) {
  return (
    <div className="group min-w-0">
      <div
        className={`relative flex h-24 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${product.tone} p-3`}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute left-3 top-3 rounded-full bg-white/65 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-black/50">
          {product.category}
        </div>

        <button
          onClick={() => addToCart(product)}
          aria-label={`Agregar ${product.name}`}
          className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-[#252525] text-white transition group-hover:bg-[#4e0611]"
        >
          <Plus size={14} />
        </button>
      </div>

      <p className="mt-3 truncate text-xs font-semibold">
        {product.name}
      </p>

      <p className="mt-1 text-xs text-black/45">
        {formatPrice(product.price)}
      </p>
    </div>
  );
}