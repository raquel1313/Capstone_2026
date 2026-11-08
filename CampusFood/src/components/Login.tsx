import { useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import logo from '@/assets/images/logo.png';

type LoginResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

interface LoginProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<LoginResult>;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await onLogin(email, password);

      if (!result.ok) {
        setError(result.message);
        setPassword('');
      }
    } catch (submitError) {
      console.error('Error al iniciar sesión:', submitError);

      setError(
        'No fue posible iniciar sesión. Inténtalo nuevamente.',
      );
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#4e0611] px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src={logo}
            alt="Casino CampusFood"
            className="h-20 w-auto"
            priority
          />

          <h1
            className="mt-4 text-6xl leading-none text-white"
            style={{
              fontFamily: "'Caveat', cursive",
            }}
          >
            ¡Hola de nuevo!
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/80">
            Inicia sesión para continuar.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-9 space-y-4"
        >
          <div>
            <label
              htmlFor="login-email"
              className="text-xs font-medium uppercase tracking-wider text-white/80"
            >
              Correo
            </label>

            <div className="relative mt-2">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                size={16}
                aria-hidden="true"
              />

              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoFocus
                required
                disabled={submitting}
                className="w-full rounded-2xl border border-white/50 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="tu@correo.cl"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="text-xs font-medium uppercase tracking-wider text-white/80"
            >
              Contraseña
            </label>

            <div className="relative mt-2">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                size={16}
                aria-hidden="true"
              />

              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                disabled={submitting}
                className="w-full rounded-2xl border border-white/50 bg-white/5 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#252525] transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting
              ? 'Ingresando...'
              : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}