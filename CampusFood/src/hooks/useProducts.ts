import { useEffect, useState } from 'react';
import type { Product } from '@/data';
import { products as defaultProducts } from '@/data';

const STORAGE_KEY = 'campusfood_products';

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function nextId(products: Product[]) {
  return products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...updates } : product)));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((current) => [...current, { ...product, id: nextId(current) }]);
  };

  const removeProduct = (id: number) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  // Suma o resta unidades al stock (solo si el producto lleva control de stock)
  const adjustStock = (id: number, delta: number) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === id && typeof product.stock === 'number'
          ? { ...product, stock: Math.max(0, product.stock + delta) }
          : product
      )
    );
  };

  const resetProducts = () => setProducts(defaultProducts);

  return { products, addProduct, updateProduct, removeProduct, adjustStock, resetProducts };
}