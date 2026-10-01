export interface ReelData {
  thumbnailUrl: string;
  postUrl: string;
  caption: string;
  plays: number;
}

export interface Venue {
  id: number;
  name: string;
  type: string;
  cuisine?: string;
  image?: string;
  rating?: number;
  walkMinutes: number;
  reason: string;
  reel?: ReelData | null;
}

export interface FlowStop {
  time: string;
  role: string;
  venue: Venue & { walkFromPrevious: number; transitionKm?: number };
}

export interface Flow {
  name: string;
  subtitle: string;
  stops: FlowStop[];
  images: string[];
  stopCount: number;
}

export interface Rail {
  title: string;
  subtitle: string;
  intent: string;
  venues: Venue[];
}

export interface MoodChip {
  key: string;
  label: string;
  icon: string;
}

export interface WelcomeData {
  property: { name: string; slug: string; neighborhood: string; address: string };
  time: { period: string; greeting: string; dayName: string; timeStr: string };
  moodChips: MoodChip[];
  hero: Venue | null;
  pick: Venue | null;
  flows: Flow[];
  nearby: Venue[];
  rails: Rail[];
  intentResults: Venue[];
  total: number;
}
