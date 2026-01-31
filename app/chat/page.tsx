'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to homepage for now
    router.push('/');
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
