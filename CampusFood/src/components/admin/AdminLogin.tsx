import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export function AdminLogin({ onLogin }: { onLogin: (username: string, password: string) => boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Usuario o contraseña incorrectos.');
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] px-5">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#252525] text-white">
          <ShieldCheck size={22} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Panel administrativo</h1>
        <p className="mt-2 text-sm leading-6 text-black/50">Acceso exclusivo para personal del casino y cafetería.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-black/40">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoFocus
              className="mt-2 w-full rounded-2xl border border-black/5 bg-[#f5f5f3] px-4 py-3 text-sm outline-none transition focus:border-[#ef7d44]"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-black/40">Contraseña</label>
            <div className="relative mt-2">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={16} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-black/5 bg-[#f5f5f3] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ef7d44]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-full bg-[#252525] py-3.5 text-sm font-semibold text-white transition hover:bg-[#ef7d44]"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}