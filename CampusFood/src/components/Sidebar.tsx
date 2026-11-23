import { BookOpen, CircleUserRound, Home, ShoppingBag, Utensils } from 'lucide-react';
import type { View } from '@/types';

export function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <aside className="hidden w-[264px] flex-col border-r border-ink/10 bg-white px-7 py-8 lg:flex">
      <div className="flex items-center gap-3 pb-12">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white"><Utensils size={19} /></div>
        <span className="text-2xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
          Campus<span className="text-brand">Food</span>
        </span>
      </div>
      <nav className="space-y-2">
        <NavButton icon={<Home size={19} />} label="Inicio" active={view === 'home'} onClick={() => setView('home')} />
        <NavButton icon={<BookOpen size={19} />} label="Menú semanal" active={view === 'menu'} onClick={() => setView('menu')} />
        <NavButton icon={<ShoppingBag size={19} />} label="Cafetería" active={view === 'orders'} onClick={() => setView('orders')} />
        <NavButton icon={<CircleUserRound size={19} />} label="Mi perfil" active={view === 'profile'} onClick={() => setView('profile')} />
      </nav>
    </aside>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-brand text-white shadow-[inset_3px_0_0_#E3A83F]' : 'text-ink/65 hover:bg-surface hover:text-ink'}`}>
      {icon}{label}
    </button>
  );
}