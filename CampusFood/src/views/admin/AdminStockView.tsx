'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  Boxes,
  Check,
  PackageCheck,
  PackageX,
  RefreshCw,
  Save,
  Search,
} from 'lucide-react';

type StockProduct = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  active: boolean;
  categoryId: number;
  category: string;
  soldOut: boolean;
  updatedAt: string;
};

type StockResponse = {
  products: StockProduct[];
};

type UpdateStockResponse = {
  product: {
    id: number;
    sku: string;
    name: string;
    stock: number;
    active: boolean;
    soldOut: boolean;
    updatedAt: string;
  };
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

async function getResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data: unknown =
      await response.json();

    if (
      isRecord(data) &&
      typeof data.error === 'string'
    ) {
      return data.error;
    }
  } catch {
    // La respuesta puede no contener JSON.
  }

  return fallback;
}

function formatUpdatedAt(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Sin información';
  }

  return new Intl.DateTimeFormat(
    'es-CL',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date);
}

export function AdminStockView() {
  const [
    products,
    setProducts,
  ] = useState<StockProduct[]>([]);

  /*
   * El valor del input se mantiene separado
   * del stock confirmado por el servidor.
   *
   * Solo actualizamos products después de
   * recibir una respuesta exitosa del PATCH.
   */
  const [
    stockDrafts,
    setStockDrafts,
  ] = useState<
    Record<number, string>
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    savingId,
    setSavingId,
  ] = useState<number | null>(
    null,
  );

  const [
    rowErrors,
    setRowErrors,
  ] = useState<
    Record<number, string>
  >({});

  const [
    search,
    setSearch,
  ] = useState('');

  const loadStock =
    useCallback(
      async (
        signal?: AbortSignal,
      ): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              '/api/admin/stock',
              {
                method: 'GET',
                cache: 'no-store',
                credentials:
                  'same-origin',
                signal,
              },
            );

          if (!response.ok) {
            throw new Error(
              await getResponseError(
                response,
                'No fue posible obtener el inventario.',
              ),
            );
          }

          const data =
            (await response.json()) as StockResponse;

          setProducts(
            data.products,
          );

          setStockDrafts(
            Object.fromEntries(
              data.products.map(
                (product) => [
                  product.id,
                  String(
                    product.stock,
                  ),
                ],
              ),
            ),
          );
        } catch (loadError) {
          if (
            loadError instanceof
              DOMException &&
            loadError.name ===
              'AbortError'
          ) {
            return;
          }

          console.error(
            'Error cargando inventario:',
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible obtener el inventario.',
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadStock(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadStock]);

  const handleStockChange = (
    productId: number,
    value: string,
  ): void => {
    /*
     * El input solo admite dígitos.
     * Permitimos vacío temporalmente para
     * que el usuario pueda reemplazar
     * completamente el número.
     */
    if (
      value !== '' &&
      !/^\d+$/.test(value)
    ) {
      return;
    }

    setStockDrafts(
      (current) => ({
        ...current,
        [productId]: value,
      }),
    );

    setRowErrors(
      (current) => {
        const next = {
          ...current,
        };

        delete next[
          productId
        ];

        return next;
      },
    );
  };

  const saveStock =
    async (
      product: StockProduct,
    ): Promise<void> => {
      const rawValue =
        stockDrafts[
          product.id
        ]?.trim();

      if (
        !rawValue ||
        !/^\d+$/.test(
          rawValue,
        )
      ) {
        setRowErrors(
          (current) => ({
            ...current,
            [product.id]:
              'Ingresa un stock válido.',
          }),
        );

        return;
      }

      const stock =
        Number(rawValue);

      if (
        !Number.isSafeInteger(
          stock,
        ) ||
        stock < 0
      ) {
        setRowErrors(
          (current) => ({
            ...current,
            [product.id]:
              'El stock debe ser un entero mayor o igual a 0.',
          }),
        );

        return;
      }

      /*
       * No enviamos una escritura si
       * el valor no cambió.
       */
      if (
        stock ===
        product.stock
      ) {
        return;
      }

      setSavingId(
        product.id,
      );

      setRowErrors(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            product.id
          ];

          return next;
        },
      );

      try {
        const response =
          await fetch(
            `/api/admin/products/${product.id}/stock`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              credentials:
                'same-origin',

              body:
                JSON.stringify({
                  stock,
                }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await getResponseError(
              response,
              'No fue posible actualizar el stock.',
            ),
          );
        }

        const data =
          (await response.json()) as UpdateStockResponse;

        /*
         * El servidor continúa siendo
         * la fuente de verdad.
         *
         * Actualizamos la UI con la
         * respuesta real del backend.
         */
        setProducts(
          (current) =>
            current.map(
              (currentProduct) =>
                currentProduct.id ===
                product.id
                  ? {
                      ...currentProduct,

                      stock:
                        data.product
                          .stock,

                      active:
                        data.product
                          .active,

                      soldOut:
                        data.product
                          .soldOut,

                      updatedAt:
                        data.product
                          .updatedAt,
                    }
                  : currentProduct,
            ),
        );

        setStockDrafts(
          (current) => ({
            ...current,

            [product.id]:
              String(
                data.product
                  .stock,
              ),
          }),
        );
      } catch (saveError) {
        console.error(
          'Error actualizando stock:',
          saveError,
        );

        setRowErrors(
          (current) => ({
            ...current,

            [product.id]:
              saveError instanceof
              Error
                ? saveError.message
                : 'No fue posible actualizar el stock.',
          }),
        );
      } finally {
        setSavingId(null);
      }
    };

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredProducts =
    useMemo(
      () =>
        products.filter(
          (product) => {
            if (
              !normalizedSearch
            ) {
              return true;
            }

            return (
              product.name
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ) ||
              product.sku
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ) ||
              product.category
                .toLowerCase()
                .includes(
                  normalizedSearch,
                )
            );
          },
        ),
      [
        normalizedSearch,
        products,
      ],
    );

  const totalStock =
    products.reduce(
      (
        total,
        product,
      ) =>
        total +
        product.stock,
      0,
    );

  const soldOutCount =
    products.filter(
      (product) =>
        product.stock === 0,
    ).length;

  /*
   * Para la vista inicial consideramos
   * stock bajo entre 1 y 5 unidades.
   *
   * Esto es solo una regla visual;
   * no modifica reglas de negocio.
   */
  const lowStockCount =
    products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <= 5,
    ).length;

  return (
    <div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Productos"
          value={
            products.length
          }
          icon={
            <Boxes size={16} />
          }
        />

        <MetricCard
          label="Unidades en inventario"
          value={totalStock}
          icon={
            <PackageCheck
              size={16}
            />
          }
        />

        <MetricCard
          label="Stock bajo"
          value={lowStockCount}
          icon={
            <AlertTriangle
              size={16}
            />
          }
        />

        <MetricCard
          label="Agotados"
          value={soldOutCount}
          icon={
            <PackageX
              size={16}
            />
          }
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            Inventario
          </h2>

          <p className="mt-1 text-xs text-black/45">
            Consulta y actualiza
            las existencias de los
            productos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadStock();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black/45 transition hover:bg-[#f8edef] hover:text-[#4e0611] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={
              loading
                ? 'animate-spin'
                : undefined
            }
          />

          Actualizar
        </button>
      </div>

      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/30"
        />

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Buscar por producto, SKU o categoría"
          className="w-full rounded-full border border-black/5 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#4e0611]"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              void loadStock();
            }}
            className="shrink-0 text-xs font-semibold text-red-700 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading &&
      products.length === 0 ? (
        <div className="rounded-[28px] bg-white p-14 text-center">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-black/20"
          />

          <p className="mt-4 text-sm text-black/45">
            Cargando
            inventario...
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] bg-white">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px_180px_140px] gap-4 border-b border-black/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-black/35 md:grid">
            <span>
              Producto
            </span>

            <span>
              Categoría
            </span>

            <span>
              Estado
            </span>

            <span>
              Stock
            </span>

            <span>
              Actualización
            </span>
          </div>

          {filteredProducts.map(
            (product) => {
              const draft =
                stockDrafts[
                  product.id
                ] ??
                String(
                  product.stock,
                );

              const draftNumber =
                Number(draft);

              const hasChanges =
                draft !== '' &&
                Number.isSafeInteger(
                  draftNumber,
                ) &&
                draftNumber >= 0 &&
                draftNumber !==
                  product.stock;

              const saving =
                savingId ===
                product.id;

              const stockStatus =
                product.stock === 0
                  ? 'Agotado'
                  : product.stock <=
                      5
                    ? 'Stock bajo'
                    : 'Disponible';

              return (
                <div
                  key={
                    product.id
                  }
                  className="grid gap-4 border-b border-black/5 px-5 py-5 last:border-b-0 md:grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px_180px_140px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {
                        product.name
                      }
                    </p>

                    <p className="mt-1 truncate text-xs text-black/40">
                      {
                        product.sku
                      }
                    </p>

                    {!product.active && (
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Producto
                        inactivo
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-black/40 md:hidden">
                      Categoría
                    </p>

                    <p className="mt-1 text-sm md:mt-0">
                      {
                        product.category
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/40 md:hidden">
                      Estado
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider md:mt-0 ${
                        product.stock ===
                        0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <=
                              5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {
                        stockStatus
                      }
                    </span>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-black/40 md:hidden">
                      Stock
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={
                          draft
                        }
                        onChange={(
                          event,
                        ) =>
                          handleStockChange(
                            product.id,
                            event
                              .target
                              .value,
                          )
                        }
                        disabled={
                          saving
                        }
                        aria-label={`Stock de ${product.name}`}
                        className="w-24 rounded-xl border border-black/5 bg-[#f8edef] px-3 py-2 text-center text-sm font-semibold outline-none focus:border-[#4e0611] disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void saveStock(
                            product,
                          );
                        }}
                        disabled={
                          saving ||
                          !hasChanges
                        }
                        aria-label={`Guardar stock de ${product.name}`}
                        className="grid h-9 w-9 place-items-center rounded-full bg-[#4e0611] text-white transition hover:bg-[#36040c] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {saving ? (
                          <RefreshCw
                            size={
                              14
                            }
                            className="animate-spin"
                          />
                        ) : hasChanges ? (
                          <Save
                            size={
                              14
                            }
                          />
                        ) : (
                          <Check
                            size={
                              14
                            }
                          />
                        )}
                      </button>
                    </div>

                    {rowErrors[
                      product.id
                    ] && (
                      <p
                        role="alert"
                        className="mt-2 text-xs text-red-500"
                      >
                        {
                          rowErrors[
                            product.id
                          ]
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-black/40 md:hidden">
                      Última
                      actualización
                    </p>

                    <p className="mt-1 text-xs text-black/45 md:mt-0">
                      {formatUpdatedAt(
                        product.updatedAt,
                      )}
                    </p>
                  </div>
                </div>
              );
            },
          )}

          {filteredProducts.length ===
            0 && (
            <div className="p-14 text-center">
              <Boxes
                size={32}
                className="mx-auto text-black/20"
              />

              <p className="mt-4 text-sm text-black/45">
                No se
                encontraron
                productos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-white p-4">
      <div className="flex items-center justify-between text-black/30">
        <span className="text-xs text-black/40">
          {label}
        </span>

        {icon}
      </div>

      <p className="mt-1 text-2xl font-semibold text-[#4e0611]">
        {value}
      </p>
    </div>
  );
}