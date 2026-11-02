'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {
  Product,
  ProductTheme,
} from '@/data';

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
    theme: value.theme,
    tone: value.tone,
    image: value.image,
    active: value.active,
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

async function fetchProducts(
  signal?: AbortSignal,
): Promise<Product[]> {
  const response = await fetch(
    '/api/products',
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
      'La API devolvió una respuesta inválida.',
    );
  }

  const products =
    data.products.map(parseProduct);

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

  return products as Product[];
}

export function useProducts() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProducts() {
      try {
        const result =
          await fetchProducts(
            controller.signal,
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setProducts(result);
        setError(null);
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === 'AbortError'
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible obtener los productos.',
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      controller.abort();
    };
  }, []);

  const refreshProducts =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await fetchProducts();

        setProducts(result);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible obtener los productos.';

        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    }, []);

  return {
    products,
    loading,
    error,
    refreshProducts,
  };
}