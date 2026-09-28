import { useEffect, useState } from 'react';
import Image from 'next/image';
import logo from '@/assets/images/logo.png';

const COUNT_DURATION_MS = 2500;

interface SplashScreenProps {
  done: boolean;
}

export function SplashScreen({ done }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (done) return;

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const value = Math.min(
        100,
        Math.round(((now - start) / COUNT_DURATION_MS) * 100)
      );

      setProgress((previousProgress) =>
        Math.max(previousProgress, value)
      );

      if (value < 100) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [done]);

  const displayedProgress = done ? 100 : progress;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#4e0611] transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
        done
          ? 'scale-110 opacity-0 blur-sm duration-[400ms]'
          : 'scale-100 opacity-100 blur-0 duration-200'
      }`}
    >
      <Image
        src={logo}
        alt="Casino CampusFood"
        className="h-40 w-auto animate-bounce"
      />

      <p
        className="mt-6 text-5xl font-semibold tracking-wide text-white"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        CampusFood
      </p>

      <p className="mt-3 text-xl font-medium tabular-nums text-white/80">
        {displayedProgress}%
      </p>
    </div>
  );
}