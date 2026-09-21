'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isEnabled, setIsEnabled] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isTouch || reducedMotion) return;
    
    setIsEnabled(true);

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth - 0.5) * 15,
          y: (e.clientY / window.innerHeight - 0.5) * 15,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const motion = (depth: number) => {
    if (!isEnabled) return {};
    return {
      transform: `translate3d(${mousePos.x * depth}px, ${mousePos.y * depth}px, 0) rotateY(${mousePos.x * 0.05}deg) rotateX(${-mousePos.y * 0.05}deg)`,
    };
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6" style={{ perspective: '1500px' }}>
      
      {/* Desktop Dashboard - Back Left */}
      <div 
        className="absolute w-[550px] h-[350px] transition-transform duration-500 ease-out hidden lg:block opacity-50"
        style={{ left: '2%', top: '20%', ...motion(0.3) }}
      >
        <div className="w-full h-full bg-gray-800/60 rounded-xl border border-gray-700/30 shadow-2xl overflow-hidden">
          <div className="h-7 bg-gray-900/80 flex items-center px-3 gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-purple-500/20 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-400">247</div>
                <div className="text-[10px] text-gray-500">Bookings</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400">$12K</div>
                <div className="text-[10px] text-gray-500">Revenue</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400">89%</div>
                <div className="text-[10px] text-gray-500">Fill Rate</div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg h-40" />
          </div>
        </div>
      </div>

      {/* Main Phone - Center */}
      <div className="relative z-20 transition-transform duration-300 ease-out" style={motion(0.2)}>
        <div className="relative w-[260px] h-[520px] md:w-[280px] md:h-[560px]">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-[0_0_80px_rgba(139,92,246,0.25)]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full" />
            <div className="absolute top-8 left-3 right-3 bottom-3 bg-gray-900 rounded-[2rem] overflow-hidden">
              {/* App Preview Content */}
              <div className="h-full bg-gradient-to-b from-gray-900 to-black p-4">
                <div className="flex justify-between text-[10px] text-gray-500 mb-4">
                  <span>9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-2 bg-white rounded-sm" />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-base font-semibold">Hey! 👋</div>
                  <div className="text-gray-400 text-xs">What vibe tonight?</div>
                </div>
                <div className="space-y-2">
                  {['Date Night', 'Friends', 'Solo', 'Group'].map((opt, i) => (
                    <div 
                      key={opt}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium ${
                        i === 0 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                          : 'bg-gray-800/60 text-gray-300 border border-gray-700/50'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Phone - Right */}
      <div 
        className="absolute w-[200px] h-[400px] transition-transform duration-500 ease-out hidden lg:block opacity-60"
        style={{ right: '8%', top: '18%', ...motion(0.5) }}
      >
        <div className="w-full h-full bg-gray-800/70 rounded-[2rem] border-4 border-gray-700/50 shadow-xl overflow-hidden">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-black rounded-full" />
          <div className="absolute top-6 left-2 right-2 bottom-2 bg-gray-900/90 rounded-[1.5rem] p-3">
            <div className="h-20 bg-gradient-to-br from-purple-500/30 to-pink-500/20 rounded-xl mb-2" />
            <div className="h-2 bg-gray-700 rounded w-3/4 mb-1.5" />
            <div className="h-2 bg-gray-700/50 rounded w-1/2 mb-3" />
            <div className="flex gap-1.5 mb-3">
              <div className="px-2 py-1 bg-purple-500/20 rounded-full text-[8px] text-purple-300">Lounge</div>
              <div className="px-2 py-1 bg-pink-500/20 rounded-full text-[8px] text-pink-300">Date</div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square bg-gray-800/50 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Text */}
      <div className="absolute bottom-16 md:bottom-20 left-0 right-0 text-center z-30 px-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
          Your night, curated.
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          AI-powered nightlife. Plan your entire evening in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://apps.apple.com/app/lumina" 
            className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition"
            aria-label="Download Viberyte on the App Store"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download on iOS
          </a>
          <a 
            href="#features" 
            className="inline-flex items-center justify-center border border-gray-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/5 transition"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
