import { Suspense } from 'react';
import ClaimErrorContent from './ClaimErrorContent';

export default function ClaimErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ClaimErrorContent />
    </Suspense>
  );
}
