import { BookOpen, CircleUserRound, Home, ShoppingBag } from 'lucide-react';
import type { View } from '@/types';

export function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/5 bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <MobileNav icon={<Home size={19} />} label="Inicio" active={view === 'home'} onClick={() => setView('home')} />
        <MobileNav icon={<BookOpen size={19} />} label="Menú" active={view === 'menu'} onClick={() => setView('menu')} />
        <MobileNav icon={<ShoppingBag size={19} />} label="Cafetería" active={view === 'orders'} onClick={() => setView('orders')} />
        <MobileNav icon={<CircleUserRound size={19} />} label="Perfil" active={view === 'profile'} onClick={() => setView('profile')} />
      </div>
    </nav>
  );
}

function MobileNav({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 text-[10px] font-medium ${active ? 'text-[#4e0611]' : 'text-black/35'}`}>
      {icon}{label}
    </button>
  );
}