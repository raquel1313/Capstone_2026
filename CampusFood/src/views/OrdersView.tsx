import { useState } from 'react';
import Image from 'next/image';
import { Plus, Search } from 'lucide-react';

import {
  formatPrice,
  type Product,
} from '@/data';

interface OrdersViewProps {
  products: Product[];
  addToCart: (product: Product) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
}

export function OrdersView({
  products,
  addToCart,
  category,
  setCategory,
}: OrdersViewProps) {
  const [query, setQuery] = useState('');

  const categories = Array.from(
    new Set(products.map((product) => product.category))
  );

  if (category && !categories.includes(category)) {
    categories.push(category);
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('es-CL');

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      category === null || product.category === category;

    const matchesQuery = product.name
      .toLocaleLowerCase('es-CL')
      .includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="pb-5">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
          Compra rápida
        </p>

        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Cafetería
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-black/50">
          Elige tus productos, confirma tu pedido y retíralo en el mesón.
        </p>
      </div>

      <div className="relative mb-4 max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
          size={17}
        />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar snacks, bebidas..."
          aria-label="Buscar productos"
          className="w-full rounded-2xl border border-black/5 bg-white py-4 pl-11 pr-4 text-sm outline-none transition placeholder:text-black/35 focus:border-[#4e0611]"
        />
      </div>

      <div className="mb-7 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
            category === null
              ? 'bg-[#4e0611] text-white'
              : 'bg-white font-medium text-black/55 hover:bg-black/5'
          }`}
        >
          Todo
        </button>

        {categories.map((name) => (
          <button
            type="button"
            key={name}
            onClick={() => setCategory(name)}
            aria-pressed={category === name}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              category === name
                ? 'bg-[#4e0611] text-white'
                : 'bg-white font-medium text-black/55 hover:bg-black/5'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-sm text-black/45">
          No hay productos disponibles para esta búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const isSoldOut = product.soldOut ?? false;

            return (
              <div
                key={product.id}
                className="rounded-3xl bg-white p-3"
              >
                <div
                  className={`relative h-40 overflow-hidden rounded-2xl bg-gradient-to-br ${product.tone}`}
                >
                  {product.image && (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className={`object-cover ${
                        isSoldOut ? 'grayscale' : ''
                      }`}
                    />
                  )}

                  {isSoldOut && (
                    <div className="absolute inset-0 grid place-items-center bg-black/30">
                      <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Agotado
                      </span>
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-black/50">
                    {product.category}
                  </div>
                </div>

                <div className="p-2 pt-4">
                  <p className="font-semibold">
                    {product.name}
                  </p>

                  <p className="mt-1 text-xs text-black/45">
                    {product.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {formatPrice(product.price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={isSoldOut}
                      aria-label={
                        isSoldOut
                          ? `${product.name} agotado`
                          : `Agregar ${product.name}`
                      }
                      className={`grid h-9 w-9 place-items-center rounded-full text-white transition ${
                        isSoldOut
                          ? 'cursor-not-allowed bg-black/25'
                          : 'bg-[#252525] hover:bg-[#4e0611]'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}