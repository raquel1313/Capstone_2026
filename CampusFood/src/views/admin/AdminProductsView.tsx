import { useState } from 'react';

import { Check, Eye, EyeOff, Package, Plus, Pencil, RotateCcw, Trash2, X } from 'lucide-react';

import type { Product } from '@/data';

import Image from 'next/image';

import { formatPrice } from '@/data';

const CATEGORY_OPTIONS = ['Dulce', 'Bebidas', 'Snacks'];

type AvailabilityFilter = 'todos' | 'disponibles' | 'agotados';

const TONE_OPTIONS = [
  { label: 'Ámbar', value: 'from-amber-100 to-orange-200' },
  { label: 'Amarillo', value: 'from-yellow-100 to-amber-200' },
  { label: 'Rosado', value: 'from-rose-100 to-red-200' },
  { label: 'Celeste', value: 'from-sky-100 to-cyan-200' },
  { label: 'Verde', value: 'from-lime-100 to-green-200' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 0,
  category: CATEGORY_OPTIONS[0],
  tone: TONE_OPTIONS[0].value,
  image: '',
  soldOut: false,
};

type FormValues = typeof EMPTY_FORM;

function ProductForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormValues;
  onSave: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (form.price <= 0) {
      setError('El precio debe ser mayor a 0.');
      return;
    }

    onSave(form);
  };

  return (
    <div className="rounded-[24px] border-2 border-dashed border-[#4e0611]/40 bg-white p-5">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-black/40">Nombre</label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ej. Queque de zanahoria"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label className="text-xs text-black/40">Descripción</label>
          <input
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Ej. Suave, casero y con nueces"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-black/40">Precio (CLP)</label>
            <input
              type="number"
              min={0}
              value={form.price || ''}
              onChange={(event) =>
                setForm({ ...form, price: Number(event.target.value) })
              }
              placeholder="1990"
              className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
            />
          </div>

          <div>
            <label className="text-xs text-black/40">Categoría</label>
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-black/40">Color de fondo</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setForm({ ...form, tone: option.value })}
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                  option.value
                } transition ${
                  form.tone === option.value
                    ? 'ring-2 ring-[#4e0611] ring-offset-2'
                    : ''
                }`}
                title={option.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-black/40">URL de imagen (opcional)</label>
          <input
            value={form.image}
            onChange={(event) => setForm({ ...form, image: event.target.value })}
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-black/50">
          <input
            type="checkbox"
            checked={form.soldOut}
            onChange={(event) =>
              setForm({ ...form, soldOut: event.target.checked })
            }
            className="h-4 w-4 rounded accent-red-500"
          />
          Marcar como agotado
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white hover:bg-[#36040c]"
        >
          <Check size={14} /> Guardar
        </button>

        <button
          onClick={onCancel}
          className="rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 hover:bg-black/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onSave,
  onRemove,
  onToggleSoldOut,
}: {
  product: Product;
  onSave: (values: FormValues) => void;
  onRemove: () => void;
  onToggleSoldOut: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const soldOut = product.soldOut ?? false;

  if (editing) {
    return (
      <ProductForm
        initial={{
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          tone: product.tone,
          image:
            typeof product.image === 'string'
              ? product.image
              : product.image?.src ?? '',
          soldOut,
          }}
        onSave={(values) => {
          onSave(values);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`rounded-[24px] bg-white p-4 ${
        soldOut ? 'ring-1 ring-red-200' : ''
      }`}
    >
      <div
        className={`relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br ${product.tone}`}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            className={`absolute inset-0 h-full w-full object-cover ${
              soldOut ? 'grayscale' : ''
            }`}
          />
        )}

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Agotado
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-black/50">
          {product.category}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{product.name}</p>

          <p className="mt-1 text-xs text-black/45">
            {product.description}
          </p>

          <p className="mt-1.5 text-sm font-semibold text-[#4e0611]">
            {formatPrice(product.price)}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => setEditing(true)}
            aria-label={`Editar ${product.name}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611]"
          >
            <Pencil size={13} />
          </button>

          {confirmingDelete ? (
            <button
              onClick={onRemove}
              aria-label={`Confirmar eliminación de ${product.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            >
              <Check size={13} />
            </button>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Eliminar ${product.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          )}

          {confirmingDelete && (
            <button
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancelar eliminación"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onToggleSoldOut}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition ${
          soldOut
            ? 'bg-[#4e0611] text-white hover:bg-[#36040c]'
            : 'bg-[#f8edef] text-black/60 hover:bg-black/10 hover:text-[#4e0611]'
        }`}
      >
        {soldOut ? <Eye size={13} /> : <EyeOff size={13} />}
        {soldOut ? 'Volver a disponible' : 'Marcar como agotado'}
      </button>
    </div>
  );
}

export function AdminProductsView({
  products,
  addProduct,
  updateProduct,
  removeProduct,
  resetProducts,
}: {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  resetProducts: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('todos');

  const categories = [
    'todas',
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const soldOutCount = products.filter((p) => p.soldOut).length;

  const filteredByCategory =
    categoryFilter === 'todas'
      ? products
      : products.filter((p) => p.category === categoryFilter);

  const filteredByAvailability = filteredByCategory.filter((p) => {
    const isSoldOut = p.soldOut ?? false;

    if (availabilityFilter === 'disponibles') return !isSoldOut;
    if (availabilityFilter === 'agotados') return isSoldOut;
    return true;
  });

  // Disponibles primero, agotados al final
  const filtered = [...filteredByAvailability].sort(
    (a, b) => Number(a.soldOut ?? false) - Number(b.soldOut ?? false)
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                categoryFilter === category
                  ? 'bg-[#4e0611] text-white'
                  : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetProducts}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611]"
          >
            <RotateCcw size={13} /> Restaurar
          </button>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
          >
            <Plus size={13} /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setAvailabilityFilter('todos')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            availabilityFilter === 'todos'
              ? 'bg-[#252525] text-white'
              : 'bg-white text-black/45 hover:bg-black/5'
          }`}
        >
          Todos
        </button>

        <button
          onClick={() => setAvailabilityFilter('disponibles')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            availabilityFilter === 'disponibles'
              ? 'bg-[#252525] text-white'
              : 'bg-white text-black/45 hover:bg-black/5'
          }`}
        >
          <Eye size={12} /> Disponibles
        </button>

        <button
          onClick={() => setAvailabilityFilter('agotados')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            availabilityFilter === 'agotados'
              ? 'bg-red-600 text-white'
              : 'bg-white text-black/45 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          <EyeOff size={12} /> Agotados{soldOutCount > 0 ? ` (${soldOutCount})` : ''}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adding && (
          <ProductForm
            initial={EMPTY_FORM}
            onSave={(values) => {
              addProduct(values);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSave={(values) => updateProduct(product.id, values)}
            onRemove={() => removeProduct(product.id)}
            onToggleSoldOut={() =>
              updateProduct(product.id, { soldOut: !product.soldOut })
            }
          />
        ))}
      </div>

      {filtered.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
          <Package className="text-black/20" size={32} />
          <p className="mt-4 text-sm text-black/45">
            {availabilityFilter === 'agotados'
              ? 'No hay productos agotados en esta categoría.'
              : availabilityFilter === 'disponibles'
                ? 'No hay productos disponibles en esta categoría.'
                : 'No hay productos en esta categoría.'}
          </p>
        </div>
      )}
    </div>
  );
}