'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function InstagramFlowSection() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400 text-sm font-medium mb-6">
            AI Automation
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Post on Instagram. We do the rest.</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Viberyte automatically scans your Instagram posts and creates events for you - flyers, captions, and dates included. No manual entry required.
          </p>
        </div>

        {/* Animated Flow */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Instagram Post Mock */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Instagram Post Frame */}
              <div className="w-80 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 p-0.5">
                    <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">XL</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">xllounge_nyc</div>
                    <div className="text-xs text-gray-500">New York, NY</div>
                  </div>
                  {/* Instagram Icon */}
                  <svg className="w-6 h-6 ml-auto text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                {/* Flyer Image */}
                <div className="aspect-square bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-4xl font-bold mb-2">NYE 2026</div>
                    <div className="text-lg opacity-80">XL LOUNGE</div>
                    <div className="text-sm mt-4 opacity-60">DEC 31 | 10PM - 4AM</div>
                  </div>
                </div>
                {/* Caption */}
                <div className="p-4">
                  <div className="flex gap-4 mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </div>
                  <p className="text-sm"><span className="font-semibold">xllounge_nyc</span> Ring in the New Year with us! Tables available. DM for reservations.</p>
                </div>
              </div>

              {/* Animated Arrow */}
              <div className={`absolute top-1/2 -right-8 transform -translate-y-1/2 transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-0.5 bg-gradient-to-r from-pink-500 to-violet-500"></div>
                  <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Viberyte Explore */}
          <div className="flex justify-center">
            <div className={`transition-all duration-700 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-8'}`}>
              <Image 
                src="/images/partner/explore.png" 
                alt="Viberyte Explore Page" 
                width={400}
                height={800}
                className="w-full max-w-sm drop-shadow-2xl rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-center gap-8 mt-16">
          <div className={`flex items-center gap-3 transition-all duration-300 ${step >= 0 ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 0 ? 'bg-pink-500' : 'bg-zinc-800'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Post on Instagram</span>
          </div>
          <div className={`flex items-center gap-3 transition-all duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-violet-500' : 'bg-zinc-800'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-sm font-medium">AI creates event</span>
          </div>
          <div className={`flex items-center gap-3 transition-all duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-green-500' : 'bg-zinc-800'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">Live on Viberyte</span>
          </div>
        </div>

        {/* Feature Bullets */}
        <div className="grid md:grid-cols-4 gap-6 mt-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">AI detects flyers and event details</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Events publish instantly</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Edit sections, tables, pricing anytime</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No missed events, ever</p>
          </div>
        </div>
      </div>
    </section>
  );
}
