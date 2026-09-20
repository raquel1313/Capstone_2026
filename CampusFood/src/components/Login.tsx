import { useState } from 'react';

import { Lock, User as UserIcon } from 'lucide-react';

import logo from '@/assets/images/logo.png';

export function Login({ onLogin }: { onLogin: (username: string, password: string) => boolean }) {

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

    <div className="flex min-h-screen items-center justify-center bg-[#4e0611] px-5">

      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center text-center">

          <img
            src={logo}
            alt="Casino CampusFood"
            className="h-20 w-auto"
          />

          <h1
            className="mt-4 text-6xl leading-none text-white"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Hola de nuevo!
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/45">
            Inicia sesión para continuar.
          </p>

        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-4">

          <div>

            <label className="text-xs font-medium uppercase tracking-wider text-white/40">
              Usuario
            </label>

            <div className="relative mt-2">

              <UserIcon
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                size={16}
              />

              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white"
                placeholder="Tu usuario"
              />

            </div>

          </div>

          <div>

            <label className="text-xs font-medium uppercase tracking-wider text-white/40">
              Contraseña
            </label>

            <div className="relative mt-2">

              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                size={16}
              />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white"
                placeholder="••••••••"
              />

            </div>

          </div>

          {error && (
            <p className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#252525] transition hover:bg-white/90"
          >
            Ingresar
          </button>

        </form>

      </div>

    </div>

  );

}