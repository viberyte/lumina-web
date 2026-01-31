'use client';

import { useEffect, useState, useRef } from 'react';

const engines = [
  { label: 'Venue Intel', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Availability', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Crowd Data', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Preferences', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Context', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function EnginesDiagram() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          engines.forEach((_, i) => {
            setTimeout(() => setActiveIndex(i), i * 200);
          });
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative max-w-5xl mx-auto h-[420px] md:h-[480px]">
      {/* SVG Lines */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1000 480" 
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9333EA" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9333EA" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {engines.map((_, i) => {
          const startX = 100 + i * 145;
          const startY = 100;
          const endX = 500;
          const endY = 380;
          
          return (
            <path
              key={i}
              d={`M ${startX} ${startY} C ${startX} ${220}, ${endX} ${280}, ${endX} ${endY}`}
              stroke="url(#lineGrad)"
              strokeWidth="2"
              fill="none"
              className="transition-all duration-1000"
              style={{
                strokeDasharray: 500,
                strokeDashoffset: isVisible && activeIndex >= i ? 0 : 500,
                opacity: isVisible && activeIndex >= i ? 1 : 0,
                transition: `stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.12}s, opacity 0.5s ease-out ${i * 0.12}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Engine Icons - Evenly Spaced */}
      <div className="absolute top-0 left-0 right-0 grid grid-cols-6 gap-2 px-4 md:px-12">
        {engines.map((engine, i) => (
          <div
            key={i}
            className={`flex flex-col items-center transition-all duration-700 ${
              isVisible && activeIndex >= i ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
            }`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div 
              className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-900/80 border border-gray-700/50 flex items-center justify-center mb-3 transition-all duration-500 ${
                isVisible && activeIndex >= i ? 'shadow-[0_0_30px_rgba(147,51,234,0.3)]' : ''
              }`}
            >
              <svg className="w-6 h-6 md:w-7 md:h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={engine.icon} />
              </svg>
            </div>
            <span className="text-[10px] md:text-xs text-gray-400 text-center font-medium">{engine.label}</span>
          </div>
        ))}
      </div>

      {/* Center Lumina Logo */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 bottom-0 transition-all duration-1000 ${
          isVisible && activeIndex >= engines.length - 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{ transitionDelay: '900ms' }}
      >
        <div className="relative">
          {/* Glow rings */}
          <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-[2]" />
          <div className="absolute inset-0 bg-purple-600/10 blur-2xl rounded-full scale-150 animate-pulse" />
          
          {/* Logo box */}
          <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gray-900 rounded-2xl border border-purple-500/40 flex items-center justify-center shadow-2xl">
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              LUMINA
            </span>
          </div>
        </div>
        
        {/* Output */}
        <div 
          className={`flex flex-col items-center mt-5 transition-all duration-700 ${
            isVisible && activeIndex >= engines.length - 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '1.2s' }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-transparent" />
          <div className="mt-3 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <span className="text-sm text-purple-300 font-medium">Your Perfect Night</span>
          </div>
        </div>
      </div>
    </div>
  );
}
