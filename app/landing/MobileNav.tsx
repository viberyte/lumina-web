'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/5 py-6 px-6">
          <div className="flex flex-col gap-4">
            <Link 
              href="/for-business" 
              className="text-gray-300 hover:text-white transition py-2"
              onClick={() => setIsOpen(false)}
            >
              For Business
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-300 hover:text-white transition py-2"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <Link 
              href="/partner/login" 
              className="text-gray-300 hover:text-white transition py-2"
              onClick={() => setIsOpen(false)}
            >
              Partner Login
            </Link>
            <a 
              href="https://apps.apple.com/app/lumina" 
              className="bg-white text-black px-6 py-3 rounded-full text-center font-semibold mt-2"
              onClick={() => setIsOpen(false)}
            >
              Download on iOS
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
