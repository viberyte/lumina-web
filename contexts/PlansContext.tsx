'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface PlanItem {
  id: number;
  name: string;
  neighborhood: string;
  cuisine?: string;
  category?: string;
  photo?: string;
  addedAt: Date;
}

interface PlansContextType {
  plan: PlanItem[];
  addToPlan: (venue: any) => void;
  removeFromPlan: (venueId: number) => void;
  clearPlan: () => void;
  isInPlan: (venueId: number) => boolean;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanItem[]>([]);

  const addToPlan = (venue: any) => {
    const newItem: PlanItem = {
      id: venue.id,
      name: venue.name,
      neighborhood: venue.neighborhood,
      cuisine: venue.cuisine_primary || venue.cuisine,
      category: venue.category,
      photo: venue.professional_photo_url || venue.photo,
      addedAt: new Date()
    };

    setPlan(prev => {
      if (prev.some(item => item.id === venue.id)) {
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const removeFromPlan = (venueId: number) => {
    setPlan(prev => prev.filter(item => item.id !== venueId));
  };

  const clearPlan = () => {
    setPlan([]);
  };

  const isInPlan = (venueId: number) => {
    return plan.some(item => item.id === venueId);
  };

  return (
    <PlansContext.Provider value={{ plan, addToPlan, removeFromPlan, clearPlan, isInPlan }}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans must be used within PlansProvider');
  }
  return context;
}
