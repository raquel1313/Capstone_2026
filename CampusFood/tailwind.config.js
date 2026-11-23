/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Paleta central de la marca: usar estas clases (bg-brand, text-brand, bg-brand-soft...)
      // en lugar de escribir el color a mano.
      colors: {
        // Verde oscuro: color principal (texto sobre blanco 8,9:1; blanco sobre él 8,9:1).
        brand: {
          DEFAULT: '#2E5336',
          dark: '#1F3A25',
          soft: '#E8EFE9',
        },
        // Mostaza: acento (CTA, indicadores, estados destacados). Sobre ella se usa texto ink;
        // nunca como color de texto sobre fondo claro (no alcanza contraste).
        accent: {
          DEFAULT: '#E3A83F',
          dark: '#C98F27',
        },
        // Negro carbón: texto y elementos de alto contraste.
        ink: '#1C1F22',
        // Blanco cálido: fondo principal de las pantallas.
        cream: '#F9F8F6',
        // Fondo de campos y chips dentro de tarjetas blancas.
        surface: '#F1EEE8',
      },
    },
  },
  plugins: [],
};
export default config;