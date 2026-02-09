'use client';

import { useSearchParams } from 'next/navigation';
import { XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; message: string; icon: 'error' | 'warning' }> = {
  instagram_denied: {
    title: 'Instagram Access Denied',
    message: 'You denied access to your Instagram account. Please try again and allow access to verify ownership.',
    icon: 'warning',
  },
  handle_mismatch: {
    title: 'Instagram Doesn\'t Match',
    message: 'The Instagram account you logged in with doesn\'t match the one on file for this venue. Please log in with the correct account.',
    icon: 'error',
  },
  session_expired: {
    title: 'Session Expired',
    message: 'Your verification session expired. Please go back and try again.',
    icon: 'warning',
  },
  already_claimed: {
    title: 'Already Claimed',
    message: 'This page has already been claimed. If you believe this is an error, contact support.',
    icon: 'error',
  },
  instagram_failed: {
    title: 'Instagram Error',
    message: 'We couldn\'t connect to Instagram. Please try again in a few minutes.',
    icon: 'warning',
  },
  server_error: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support.',
    icon: 'error',
  },
};

export default function ClaimErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'server_error';
  const expected = searchParams.get('expected');
  const got = searchParams.get('got');

  const errorInfo = ERROR_MESSAGES[reason] || ERROR_MESSAGES.server_error;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className={`w-16 h-16 ${errorInfo.icon === 'error' ? 'bg-red-500/10' : 'bg-yellow-500/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {errorInfo.icon === 'error' ? (
            <XCircle className="w-8 h-8 text-red-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          )}
        </div>
        
        <h1 className="text-xl font-semibold text-white mb-2">{errorInfo.title}</h1>
        <p className="text-zinc-400 mb-4">{errorInfo.message}</p>
        
        {reason === 'handle_mismatch' && expected && got && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-zinc-500 mb-2">Details:</p>
            <p className="text-sm text-zinc-300">Expected: <span className="text-orange-400">@{expected}</span></p>
            <p className="text-sm text-zinc-300">You logged in as: <span className="text-red-400">@{got}</span></p>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Try Again
          </button>
          
          <Link
            href="mailto:support@viberyte.com?subject=Claim%20Issue"
            className="block w-full text-zinc-500 text-sm py-2 hover:text-zinc-400"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
