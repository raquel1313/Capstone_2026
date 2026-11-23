import { ShieldCheck } from 'lucide-react';

/**
 * Recordatorio discreto de seguridad. Se muestra solo en Perfil y en Administración
 * de usuarios, no en cada pantalla.
 */
export function SecurityNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-[11px] leading-5 text-ink/65 ${className}`}>
      <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      Por tu seguridad, no compartas tus contraseñas, códigos de acceso ni información confidencial con otras
      personas.
    </p>
  );
}
