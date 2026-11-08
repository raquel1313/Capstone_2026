import { Plus } from 'lucide-react';
import Image from 'next/image';

import {
  formatPrice,
  type Product,
} from '@/data';

export function ProductCard({
  product,
  addToCart,
}: {
  product: Product;
  addToCart: (
    product: Product,
  ) => void;
}) {
  const soldOut =
    product.stock <= 0;

  return (
    <div className="group min-w-0">
      <div
        className={`relative flex h-24 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${product.tone} p-3`}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="160px"
            className={`object-cover ${
              soldOut
                ? 'grayscale'
                : ''
            }`}
          />
        )}

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/30">
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">
              Agotado
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 z-20 rounded-full bg-white/65 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-black/50">
          {product.category}
        </div>

        <button
          type="button"
          onClick={() =>
            addToCart(product)
          }
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.name} agotado`
              : `Agregar ${product.name}`
          }
          className={`absolute bottom-2 right-2 z-20 grid h-7 w-7 place-items-center rounded-full text-white transition ${
            soldOut
              ? 'cursor-not-allowed bg-black/30'
              : 'bg-[#252525] group-hover:bg-[#4e0611]'
          }`}
        >
          <Plus size={14} />
        </button>
      </div>

      <p className="mt-3 truncate text-xs font-semibold">
        {product.name}
      </p>

      <p className="mt-1 text-xs text-black/45">
        {formatPrice(
          product.price,
        )}
      </p>
    </div>
  );
}