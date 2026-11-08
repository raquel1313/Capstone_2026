import { X } from 'lucide-react';

export function ErrorToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-[#4e0611] px-4 py-3 text-sm text-white shadow-xl lg:bottom-6"
    >
      <p className="flex-1">{message}</p>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="text-white/70 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}
