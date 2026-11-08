'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import Image from 'next/image';

import {
  formatPrice,
  type Product,
  type ProductTheme,
} from '@/data';

type Category = {
  id: number;
  name: string;
  description: string;
  active: boolean;
  productCount: number;
};

type ProductPayload = {
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  idCategoria: number;
  activo: boolean;
  imagenUrl: string | null;
  temaVisual: ProductTheme;
};

type FormState = {
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: number | null;
  active: boolean;
  image: string;
  theme: ProductTheme;
};

type SaveResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

const TONE_OPTIONS: Array<{
  label: string;
  theme: ProductTheme;
  tone: string;
}> = [
  {
    label: 'Ámbar',
    theme: 'amber',
    tone: 'from-amber-100 to-orange-200',
  },
  {
    label: 'Amarillo',
    theme: 'yellow',
    tone: 'from-yellow-100 to-amber-200',
  },
  {
    label: 'Rosado',
    theme: 'rose',
    tone: 'from-rose-100 to-red-200',
  },
  {
    label: 'Celeste',
    theme: 'sky',
    tone: 'from-sky-100 to-cyan-200',
  },
  {
    label: 'Verde',
    theme: 'lime',
    tone: 'from-lime-100 to-green-200',
  },
];

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function isProductTheme(
  value: unknown,
): value is ProductTheme {
  return (
    value === 'amber' ||
    value === 'yellow' ||
    value === 'rose' ||
    value === 'sky' ||
    value === 'lime'
  );
}

function parseProduct(
  value: unknown,
): Product | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'number' ||
    typeof value.sku !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.price !== 'number' ||
    typeof value.stock !== 'number' ||
    typeof value.categoryId !== 'number' ||
    typeof value.category !== 'string' ||
    typeof value.tone !== 'string' ||
    typeof value.active !== 'boolean' ||
    !isProductTheme(value.theme)
  ) {
    return null;
  }

  if (
    value.image !== undefined &&
    typeof value.image !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    sku: value.sku,
    name: value.name,
    description: value.description,
    price: value.price,
    stock: value.stock,
    categoryId: value.categoryId,
    category: value.category,
    active: value.active,
    image: value.image,
    theme: value.theme,
    tone: value.tone,
  };
}

function parseCategory(
  value: unknown,
): Category | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.active !== 'boolean' ||
    typeof value.productCount !== 'number'
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    active: value.active,
    productCount: value.productCount,
  };
}

async function readJson(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    isRecord(value) &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }

  return fallback;
}

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.name === 'AbortError'
  );
}

function sortProducts(
  products: Product[],
): Product[] {
  return [...products].sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'es-CL',
      ),
  );
}

async function fetchProducts(
  signal?: AbortSignal,
): Promise<Product[]> {
  const response = await fetch(
    '/api/admin/products',
    {
      method: 'GET',
      cache: 'no-store',
      signal,
    },
  );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        'No fue posible obtener los productos.',
      ),
    );
  }

  if (
    !isRecord(data) ||
    !Array.isArray(data.products)
  ) {
    throw new Error(
      'La API de productos devolvió una respuesta inválida.',
    );
  }

  const products =
    data.products.map(
      parseProduct,
    );

  if (
    products.some(
      (product) =>
        product === null,
    )
  ) {
    throw new Error(
      'La API devolvió uno o más productos inválidos.',
    );
  }

  return sortProducts(
    products as Product[],
  );
}

async function fetchCategories(
  signal?: AbortSignal,
): Promise<Category[]> {
  const response = await fetch(
    '/api/admin/categories',
    {
      method: 'GET',
      cache: 'no-store',
      signal,
    },
  );

  const data =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        'No fue posible obtener las categorías.',
      ),
    );
  }

  if (
    !isRecord(data) ||
    !Array.isArray(data.categories)
  ) {
    throw new Error(
      'La API de categorías devolvió una respuesta inválida.',
    );
  }

  const categories =
    data.categories.map(
      parseCategory,
    );

  if (
    categories.some(
      (category) =>
        category === null,
    )
  ) {
    throw new Error(
      'La API devolvió una o más categorías inválidas.',
    );
  }

  return categories as Category[];
}

async function fetchCatalogData(
  signal?: AbortSignal,
): Promise<{
  products: Product[];
  categories: Category[];
}> {
  const [
    products,
    categories,
  ] = await Promise.all([
    fetchProducts(signal),
    fetchCategories(signal),
  ]);

  return {
    products,
    categories,
  };
}

function createEmptyForm(
  categories: Category[],
): FormState {
  const defaultCategory =
    categories.find(
      (category) =>
        category.active,
    );

  return {
    sku: '',
    name: '',
    description: '',
    price: '',
    stock: '0',
    categoryId:
      defaultCategory?.id ??
      null,
    active: true,
    image: '',
    theme: 'amber',
  };
}

function productToForm(
  product: Product,
): FormState {
  return {
    sku: product.sku,
    name: product.name,
    description:
      product.description,
    price: String(
      product.price,
    ),
    stock: String(
      product.stock,
    ),
    categoryId:
      product.categoryId,
    active: product.active,
    image:
      product.image ?? '',
    theme: product.theme,
  };
}

function ProductForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial: FormState;
  categories: Category[];
  onSave: (
    payload: ProductPayload,
  ) => Promise<SaveResult>;
  onCancel: () => void;
}) {
  const [form, setForm] =
    useState<FormState>(
      initial,
    );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [saving, setSaving] =
    useState(false);

  const handleSave =
    async () => {
      setError(null);

      const sku =
        form.sku
          .trim()
          .toUpperCase();

      if (
        !/^[A-Z0-9][A-Z0-9._-]{0,49}$/.test(
          sku,
        )
      ) {
        setError(
          'El SKU es obligatorio y solo puede contener letras, números, punto, guion o guion bajo.',
        );

        return;
      }

      const name =
        form.name.trim();

      if (!name) {
        setError(
          'El nombre es obligatorio.',
        );

        return;
      }

      const price =
        Number(form.price);

      if (
        !Number.isSafeInteger(
          price,
        ) ||
        price <= 0
      ) {
        setError(
          'El precio debe ser un entero mayor que 0.',
        );

        return;
      }

      const stock =
        Number(form.stock);

      if (
        !Number.isSafeInteger(
          stock,
        ) ||
        stock < 0
      ) {
        setError(
          'El stock debe ser un entero mayor o igual a 0.',
        );

        return;
      }

      if (
        form.categoryId ===
        null
      ) {
        setError(
          'Debes seleccionar una categoría.',
        );

        return;
      }

      setSaving(true);

      try {
        const result =
          await onSave({
            sku,
            nombre: name,
            descripcion:
              form.description.trim(),
            precio: price,
            stock,
            idCategoria:
              form.categoryId,
            activo:
              form.active,
            imagenUrl:
              form.image.trim() ||
              null,
            temaVisual:
              form.theme,
          });

        if (!result.ok) {
          setError(
            result.error,
          );
        }
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="rounded-[24px] border-2 border-dashed border-[#4e0611]/40 bg-white p-5">
      <div className="space-y-3">
        <div>
          <label
            htmlFor="product-sku"
            className="text-xs text-black/40"
          >
            SKU
          </label>

          <input
            id="product-sku"
            value={form.sku}
            maxLength={50}
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                sku:
                  event.target
                    .value,
              })
            }
            placeholder="Ej. DUL-QUE-001"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm uppercase outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label
            htmlFor="product-name"
            className="text-xs text-black/40"
          >
            Nombre
          </label>

          <input
            id="product-name"
            value={form.name}
            maxLength={150}
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                name:
                  event.target
                    .value,
              })
            }
            placeholder="Ej. Queque de zanahoria"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div>
          <label
            htmlFor="product-description"
            className="text-xs text-black/40"
          >
            Descripción
          </label>

          <input
            id="product-description"
            value={
              form.description
            }
            maxLength={500}
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                description:
                  event.target
                    .value,
              })
            }
            placeholder="Ej. Suave, casero y con nueces"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="product-price"
              className="text-xs text-black/40"
            >
              Precio (CLP)
            </label>

            <input
              id="product-price"
              type="number"
              min={1}
              step={1}
              value={
                form.price
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  price:
                    event.target
                      .value,
                })
              }
              placeholder="1990"
              className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
            />
          </div>

          <div>
            <label
              htmlFor="product-stock"
              className="text-xs text-black/40"
            >
              Stock
            </label>

            <input
              id="product-stock"
              type="number"
              min={0}
              step={1}
              value={
                form.stock
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  stock:
                    event.target
                      .value,
                })
              }
              placeholder="10"
              className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="product-category"
            className="text-xs text-black/40"
          >
            Categoría
          </label>

          <select
            id="product-category"
            value={
              form.categoryId ??
              ''
            }
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                categoryId:
                  event.target
                    .value
                    ? Number(
                        event
                          .target
                          .value,
                      )
                    : null,
              })
            }
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          >
            <option
              value=""
              disabled
            >
              Selecciona una categoría
            </option>

            {categories.map(
              (
                category,
              ) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.name
                  }
                  {!category.active
                    ? ' (inactiva)'
                    : ''}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <span className="text-xs text-black/40">
            Color de fondo
          </span>

          <div className="mt-1.5 flex flex-wrap gap-2">
            {TONE_OPTIONS.map(
              (
                option,
              ) => (
                <button
                  key={
                    option.theme
                  }
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      theme:
                        option.theme,
                    })
                  }
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${option.tone} transition ${
                    form.theme ===
                    option.theme
                      ? 'ring-2 ring-[#4e0611] ring-offset-2'
                      : ''
                  }`}
                  title={
                    option.label
                  }
                  aria-label={`Usar color ${option.label}`}
                />
              ),
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="product-image"
            className="text-xs text-black/40"
          >
            Ruta o URL de imagen
          </label>

          <input
            id="product-image"
            value={
              form.image
            }
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                image:
                  event.target
                    .value,
              })
            }
            placeholder="/images/products/foto1.jpg"
            className="mt-1 w-full rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-sm outline-none focus:border-[#4e0611]"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-black/50">
          <input
            type="checkbox"
            checked={
              form.active
            }
            onChange={(
              event,
            ) =>
              setForm({
                ...form,
                active:
                  event.target
                    .checked,
              })
            }
            className="h-4 w-4 rounded accent-[#4e0611]"
          />

          Producto activo
        </label>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#4e0611] py-2.5 text-xs font-semibold text-white transition hover:bg-[#36040c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={14} />

          {saving
            ? 'Guardando...'
            : 'Guardar'}
        </button>

        <button
          type="button"
          onClick={
            onCancel
          }
          disabled={saving}
          className="rounded-full bg-[#f8edef] px-4 py-2.5 text-xs font-medium text-black/50 transition hover:bg-black/10 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  categories,
  onSave,
  onRemove,
  onToggleActive,
}: {
  product: Product;
  categories: Category[];
  onSave: (
    payload: ProductPayload,
  ) => Promise<SaveResult>;
  onRemove: () => Promise<SaveResult>;
  onToggleActive: () => Promise<SaveResult>;
}) {
  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    confirmingDelete,
    setConfirmingDelete,
  ] = useState(false);

  const [busy, setBusy] =
    useState(false);

  const soldOut =
    product.stock <= 0;

  if (editing) {
    return (
      <ProductForm
        initial={productToForm(
          product,
        )}
        categories={
          categories
        }
        onSave={async (
          payload,
        ) => {
          const result =
            await onSave(
              payload,
            );

          if (result.ok) {
            setEditing(
              false,
            );
          }

          return result;
        }}
        onCancel={() =>
          setEditing(false)
        }
      />
    );
  }

  const handleRemove =
    async () => {
      setBusy(true);

      try {
        const result =
          await onRemove();

        if (result.ok) {
          setConfirmingDelete(
            false,
          );
        }
      } finally {
        setBusy(false);
      }
    };

  const handleToggleActive =
    async () => {
      setBusy(true);

      try {
        await onToggleActive();
      } finally {
        setBusy(false);
      }
    };

  return (
    <div
      className={`rounded-[24px] bg-white p-4 ${
        !product.active
          ? 'opacity-70 ring-1 ring-black/10'
          : soldOut
            ? 'ring-1 ring-red-200'
            : ''
      }`}
    >
      <div
        className={`relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br ${product.tone}`}
      >
        {product.image && (
          <Image
            src={
              product.image
            }
            alt={
              product.name
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className={`object-cover ${
              soldOut
                ? 'grayscale'
                : ''
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
          {
            product.category
          }
        </span>

        {!product.active && (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Inactivo
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {product.name}
          </p>

          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-black/35">
            {product.sku}
          </p>

          <p className="mt-1 text-xs text-black/45">
            {
              product.description
            }
          </p>

          <p className="mt-1.5 text-sm font-semibold text-[#4e0611]">
            {formatPrice(
              product.price,
            )}
          </p>

          <p className="mt-1 text-xs text-black/45">
            Stock:{' '}
            <span className="font-semibold">
              {
                product.stock
              }
            </span>
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() =>
              setEditing(
                true,
              )
            }
            disabled={busy}
            aria-label={`Editar ${product.name}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 hover:text-[#4e0611] disabled:opacity-50"
          >
            <Pencil
              size={13}
            />
          </button>

          {confirmingDelete ? (
            <button
              type="button"
              onClick={() => {
                void handleRemove();
              }}
              disabled={busy}
              aria-label={`Confirmar eliminación de ${product.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              <Check
                size={13}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setConfirmingDelete(
                  true,
                )
              }
              disabled={busy}
              aria-label={`Eliminar ${product.name}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
              <Trash2
                size={13}
              />
            </button>
          )}

          {confirmingDelete && (
            <button
              type="button"
              onClick={() =>
                setConfirmingDelete(
                  false,
                )
              }
              disabled={busy}
              aria-label="Cancelar eliminación"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f8edef] text-black/50 transition hover:bg-black/10 disabled:opacity-50"
            >
              <X
                size={13}
              />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          void handleToggleActive();
        }}
        disabled={busy}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition disabled:opacity-50 ${
          product.active
            ? 'bg-[#f8edef] text-black/60 hover:bg-black/10 hover:text-[#4e0611]'
            : 'bg-[#4e0611] text-white hover:bg-[#36040c]'
        }`}
      >
        {product.active ? (
          <EyeOff
            size={13}
          />
        ) : (
          <Eye
            size={13}
          />
        )}

        {product.active
          ? 'Desactivar producto'
          : 'Activar producto'}
      </button>
    </div>
  );
}

export function AdminProductsView() {
  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    [],
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState<
    string | null
  >(null);

  const [
    actionError,
    setActionError,
  ] = useState<
    string | null
  >(null);

  const [
    adding,
    setAdding,
  ] = useState(false);

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState<
    'all' | number
  >('all');

  useEffect(() => {
    const controller =
      new AbortController();

    void fetchCatalogData(
      controller.signal,
    )
      .then(
        ({
          products:
            loadedProducts,
          categories:
            loadedCategories,
        }) => {
          if (
            controller
              .signal
              .aborted
          ) {
            return;
          }

          setProducts(
            loadedProducts,
          );

          setCategories(
            loadedCategories,
          );

          setLoadError(
            null,
          );
        },
      )
      .catch(
        (
          error: unknown,
        ) => {
          if (
            controller
              .signal
              .aborted ||
            isAbortError(
              error,
            )
          ) {
            return;
          }

          setLoadError(
            error instanceof
              Error
              ? error.message
              : 'No fue posible cargar el catálogo.',
          );
        },
      )
      .finally(() => {
        if (
          !controller
            .signal
            .aborted
        ) {
          setLoading(
            false,
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const retryLoad =
    async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const {
          products:
            loadedProducts,
          categories:
            loadedCategories,
        } =
          await fetchCatalogData();

        setProducts(
          loadedProducts,
        );

        setCategories(
          loadedCategories,
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el catálogo.',
        );
      } finally {
        setLoading(false);
      }
    };

  const createProduct =
    async (
      payload:
        ProductPayload,
    ): Promise<SaveResult> => {
      setActionError(null);

      try {
        const response =
          await fetch(
            '/api/admin/products',
            {
              method:
                'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

        const data =
          await readJson(
            response,
          );

        if (
          !response.ok
        ) {
          return {
            ok: false,
            error:
              getErrorMessage(
                data,
                'No fue posible crear el producto.',
              ),
          };
        }

        if (
          !isRecord(data)
        ) {
          return {
            ok: false,
            error:
              'La API devolvió una respuesta inválida.',
          };
        }

        const product =
          parseProduct(
            data.product,
          );

        if (!product) {
          return {
            ok: false,
            error:
              'La API devolvió un producto inválido.',
          };
        }

        setProducts(
          (current) =>
            sortProducts([
              ...current,
              product,
            ]),
        );

        return {
          ok: true,
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof
              Error
              ? error.message
              : 'No fue posible crear el producto.',
        };
      }
    };

  const updateProduct =
    async (
      id: number,
      payload:
        Partial<ProductPayload>,
    ): Promise<SaveResult> => {
      setActionError(null);

      try {
        const response =
          await fetch(
            `/api/admin/products/${id}`,
            {
              method:
                'PATCH',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

        const data =
          await readJson(
            response,
          );

        if (
          !response.ok
        ) {
          const error =
            getErrorMessage(
              data,
              'No fue posible actualizar el producto.',
            );

          setActionError(
            error,
          );

          return {
            ok: false,
            error,
          };
        }

        if (
          !isRecord(data)
        ) {
          return {
            ok: false,
            error:
              'La API devolvió una respuesta inválida.',
          };
        }

        const product =
          parseProduct(
            data.product,
          );

        if (!product) {
          return {
            ok: false,
            error:
              'La API devolvió un producto inválido.',
          };
        }

        setProducts(
          (current) =>
            sortProducts(
              current.map(
                (
                  currentProduct,
                ) =>
                  currentProduct.id ===
                  id
                    ? product
                    : currentProduct,
              ),
            ),
        );

        return {
          ok: true,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible actualizar el producto.';

        setActionError(
          message,
        );

        return {
          ok: false,
          error:
            message,
        };
      }
    };

  const removeProduct =
    async (
      id: number,
    ): Promise<SaveResult> => {
      setActionError(null);

      try {
        const response =
          await fetch(
            `/api/admin/products/${id}`,
            {
              method:
                'DELETE',
            },
          );

        if (
          !response.ok
        ) {
          const data =
            await readJson(
              response,
            );

          const error =
            getErrorMessage(
              data,
              'No fue posible eliminar el producto.',
            );

          setActionError(
            error,
          );

          return {
            ok: false,
            error,
          };
        }

        setProducts(
          (current) =>
            current.filter(
              (product) =>
                product.id !==
                id,
            ),
        );

        return {
          ok: true,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible eliminar el producto.';

        setActionError(
          message,
        );

        return {
          ok: false,
          error:
            message,
        };
      }
    };

  const filteredProducts =
    categoryFilter ===
    'all'
      ? products
      : products.filter(
          (product) =>
            product.categoryId ===
            categoryFilter,
        );

  const activeCategories =
    categories.filter(
      (category) =>
        category.active,
    );

  if (loading) {
    return (
      <div className="rounded-[28px] bg-white p-14 text-center">
        <p className="text-sm text-black/45">
          Cargando productos...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] bg-white p-14 text-center">
        <Package
          className="mx-auto text-black/20"
          size={32}
        />

        <p className="mt-4 text-sm text-red-600">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => {
            void retryLoad();
          }}
          className="mt-4 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>
            {actionError}
          </span>

          <button
            type="button"
            onClick={() =>
              setActionError(
                null,
              )
            }
            aria-label="Cerrar mensaje de error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setCategoryFilter(
                'all',
              )
            }
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              categoryFilter ===
              'all'
                ? 'bg-[#4e0611] text-white'
                : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
            }`}
          >
            Todas
          </button>

          {categories.map(
            (
              category,
            ) => (
              <button
                key={
                  category.id
                }
                type="button"
                onClick={() =>
                  setCategoryFilter(
                    category.id,
                  )
                }
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  categoryFilter ===
                  category.id
                    ? 'bg-[#4e0611] text-white'
                    : 'bg-white text-black/50 hover:bg-[#f8edef] hover:text-[#4e0611]'
                }`}
              >
                {
                  category.name
                }
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setAdding(true)
          }
          disabled={
            adding ||
            activeCategories.length ===
              0
          }
          className="flex items-center gap-1.5 rounded-full bg-[#4e0611] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#36040c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={13} />

          Nuevo producto
        </button>
      </div>

      {activeCategories.length ===
        0 && (
        <p className="mb-4 text-sm text-amber-700">
          No existen categorías activas. Debes activar o crear una categoría antes de crear productos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adding && (
          <ProductForm
            initial={createEmptyForm(
              activeCategories,
            )}
            categories={
              activeCategories
            }
            onSave={async (
              payload,
            ) => {
              const result =
                await createProduct(
                  payload,
                );

              if (
                result.ok
              ) {
                setAdding(
                  false,
                );
              }

              return result;
            }}
            onCancel={() =>
              setAdding(
                false,
              )
            }
          />
        )}

        {filteredProducts.map(
          (
            product,
          ) => (
            <ProductCard
              key={
                product.id
              }
              product={
                product
              }
              categories={
                categories
              }
              onSave={(
                payload,
              ) =>
                updateProduct(
                  product.id,
                  payload,
                )
              }
              onRemove={() =>
                removeProduct(
                  product.id,
                )
              }
              onToggleActive={() =>
                updateProduct(
                  product.id,
                  {
                    activo:
                      !product.active,
                  },
                )
              }
            />
          ),
        )}
      </div>

      {filteredProducts.length ===
        0 &&
        !adding && (
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-white p-14 text-center">
            <Package
              className="text-black/20"
              size={32}
            />

            <p className="mt-4 text-sm text-black/45">
              No hay productos en esta categoría.
            </p>
          </div>
        )}
    </div>
  );
}