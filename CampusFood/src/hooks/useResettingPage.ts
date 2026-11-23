import { useState } from 'react';

type PageUpdate = number | ((current: number) => number);

/**
 * Página actual de una lista paginada que vuelve a la 1 cuando cambia `resetKey`
 * (filtros o búsqueda). Se calcula durante el render, sin efectos ni renders extra.
 */
export function useResettingPage(resetKey: string): [number, (next: PageUpdate) => void] {
  const [state, setState] = useState({ key: resetKey, page: 1 });

  const page = state.key === resetKey ? state.page : 1;

  const setPage = (next: PageUpdate) => {
    setState({
      key: resetKey,
      page: typeof next === 'function' ? next(page) : next,
    });
  };

  return [page, setPage];
}
