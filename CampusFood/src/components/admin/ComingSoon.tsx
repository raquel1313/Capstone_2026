export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[28px] bg-white p-10 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">Próximamente</p>
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-black/45">
        Este módulo se implementará en el siguiente paso.
      </p>
    </div>
  );
}