'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function AnimatedSections({ appStoreUrl }: { appStoreUrl: string }) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('reveal-visible');
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 reveal">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything you need for the perfect night</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">From finding the vibe to planning the entire evening, Lumina handles it all.</p>
          </div>

          {/* Feature 1 - Continue the Night */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32 reveal">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-6">
                Continue the Night
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Dinner to drinks, seamlessly planned</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Don't let the night end early. After dinner, Lumina suggests the perfect next stop based on your vibe, location, and what's happening nearby.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Smart venue pairing suggestions
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  "Good energy shift from here"
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Best arrival times included
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/app/continue-night.png" 
                  alt="Lumina Continue the Night" 
                  width={390}
                  height={780}
                  className="w-full max-w-xs drop-shadow-2xl"
                />
              </div>
            </div>
          </div>

          {/* Feature 2 - Explore Dining */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32 reveal">
            <div className="flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/app/dining.png" 
                  alt="Lumina Dining Explorer" 
                  width={390}
                  height={780}
                  className="w-full max-w-xs drop-shadow-2xl"
                />
              </div>
            </div>
            <div>
              <div className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-6">
                Dining & Nightlife
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Explore by cuisine, vibe, or mood</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                From Italian date nights to Caribbean bold flavors, Japanese omakase to Soul Food classics. Browse by what you're craving, not just location.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Italian, Caribbean, Japanese, Mexican & more
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Switch between Nightlife, Dining & Events
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Location-aware recommendations
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Budget Meal */}
          <div className="grid lg:grid-cols-2 gap-12 items-center reveal">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
                Smart Dining
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Dine within your budget</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Set your budget and party size. Lumina finds the perfect meal options that fit - no surprises when the check comes.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Real menu prices analyzed
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Perfect for date nights
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Custom amount support
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/app/budget.png" 
                  alt="Lumina Budget Meal Finder" 
                  width={390}
                  height={780}
                  className="w-full max-w-xs drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-6 bg-white/[0.02] reveal">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-bold text-white">4,000+</div>
            <div className="text-gray-500 mt-2">Venues</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold text-white">3,800+</div>
            <div className="text-gray-500 mt-2">Events</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold text-white">7</div>
            <div className="text-gray-500 mt-2">Cities</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold text-white">Free</div>
            <div className="text-gray-500 mt-2">To Download</div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 text-center reveal">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready for better nights?</h2>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join thousands planning smarter nights with Lumina.</p>
        <a 
          href={appStoreUrl}
          className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Download on iOS
        </a>
      </section>
    </>
  );
}
