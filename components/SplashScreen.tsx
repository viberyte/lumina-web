'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}}></div>
      </div>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
      </div>
      <div className="relative z-10 space-y-12">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-violet-500/30 rounded-full"></div>
          <div className="relative w-28 h-28 mx-auto">
            <Image src="/lumina-logo.png" alt="Viberyte" fill className="object-contain drop-shadow-2xl" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-6xl font-extralight text-white tracking-wider">Viberyte</h1>
          <p className="text-lg text-zinc-400 font-light tracking-wide">Your Personal Nightlife Concierge</p>
        </div>
        <div className="text-center pt-16 space-y-2">
          <p className="text-zinc-600 text-xs font-light tracking-widest uppercase">Brought to you by</p>
          <p className="text-2xl font-light text-white tracking-widest">VIBERYTE</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer { animation: shimmer 4s infinite; }
      `}</style>
    </div>
  );
}
