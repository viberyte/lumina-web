'use client';
import { useState } from 'react';
import { Calendar, X, MapPin, Trash2 } from 'lucide-react';
import { usePlans } from '@/contexts/PlansContext';

export default function MyPlanButton() {
  const { plan, removeFromPlan, clearPlan } = usePlans();
  const [showPlan, setShowPlan] = useState(false);

  if (plan.length === 0) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowPlan(true)}
        className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-500 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 transition-all active:scale-95 animate-in slide-in-from-bottom-5"
      >
        <Calendar className="w-5 h-5" />
        <span className="font-bold">My Plan ({plan.length})</span>
      </button>

      {/* Plan Modal */}
      {showPlan && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setShowPlan(false)}
          />

          <div className="relative bg-zinc-950 w-full max-w-2xl rounded-3xl border border-zinc-800 overflow-hidden max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 p-6">
              <button
                onClick={() => setShowPlan(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="text-center pr-12">
                <h2 className="text-2xl font-bold text-white mb-2">🗓️ My Plan</h2>
                <p className="text-zinc-400">{plan.length} stop{plan.length !== 1 ? 's' : ''} planned</p>
              </div>
            </div>

            {/* Plan Items */}
            <div className="p-6 space-y-4">
              {plan.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 group hover:border-violet-500/50 transition-all"
                >
                  {/* Order Number */}
                  <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>

                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                    <img
                      src={item.photo || '/placeholder.jpg'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg line-clamp-1">{item.name}</h3>
                    <p className="text-zinc-400 text-sm line-clamp-1">{item.cuisine || item.category}</p>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{item.neighborhood}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromPlan(item.id)}
                    className="w-10 h-10 bg-zinc-800 hover:bg-red-600 rounded-full flex items-center justify-center transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-zinc-800 p-6 bg-zinc-900/50">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={clearPlan}
                  className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold transition-all active:scale-95"
                >
                  Clear Plan
                </button>
                <button
                  onClick={() => {
                    // TODO: Share or save plan
                    console.log('Share plan:', plan);
                  }}
                  className="py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-all active:scale-95"
                >
                  Share Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
