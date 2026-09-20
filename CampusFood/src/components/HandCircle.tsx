export function HandCircle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 72"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <path
        d="M22 44 C8 22 46 6 82 9 C114 12 118 42 84 58 C52 70 10 60 14 34 C17 20 40 12 58 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}