// Time-aware insight selection
// Returns modified insight based on current time

export function getTimeContext(): {
  period: 'early' | 'prime' | 'late' | 'after_hours';
  hour: number;
} {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 17 && hour < 21) return { period: 'early', hour };      // 5pm - 9pm
  if (hour >= 21 && hour < 23) return { period: 'prime', hour };      // 9pm - 11pm
  if (hour >= 23 || hour < 2) return { period: 'late', hour };        // 11pm - 2am
  if (hour >= 2 && hour < 5) return { period: 'after_hours', hour };  // 2am - 5am
  
  return { period: 'early', hour }; // Default for daytime
}

export function adaptInsightToTime(insight: string, timeContext: { period: string; hour: number }): string {
  const { period, hour } = timeContext;
  
  // Before 11pm - keep anticipation messaging
  if (period === 'early' || period === 'prime') {
    return insight; // "Don't rush—it picks up after 11" makes sense
  }
  
  // After 11pm - switch to present tense
  if (period === 'late' || period === 'after_hours') {
    return insight
      .replace("Don't rush—it picks up after 11.", "It's going off right now.")
      .replace("Don't rush—it goes off after 11.", "It's going off right now.")
      .replace("Don't rush—it picks up after 11. Trust.", "It's popping right now. Trust.")
      .replace("The atmosphere develops after 11 PM.", "The atmosphere is at its peak.")
      .replace("DJ starts at 11, worth the wait", "DJ is on right now")
      .replace("DJ goes crazy later.", "DJ is going crazy right now.")
      .replace("DJ's actually good here.", "DJ is killing it right now.")
      .replace("Live DJ later in the evening.", "Live DJ performing now.")
      .replace("Dance floor gets packed after midnight.", "Dance floor is packed right now.")
      .replace("Dance floor is so fun after midnight.", "Dance floor is so fun right now.")
      .replace("Dance floor goes crazy after midnight.", "Dance floor is going crazy.")
      .replace("The dance floor becomes active later.", "The dance floor is quite active now.")
      .replace("Gets packed after midnight", "Packed right now")
      .replace("It gets packed—in the best way.", "It's packed—in the best way.")
      .replace("Expect high energy and a packed crowd.", "High energy and packed crowd right now.")
      .replace("Gets packed. Bring energy.", "Packed right now. Energy is up.");
  }
  
  return insight;
}

export function adaptTransitionToTime(message: string, timeContext: { period: string; hour: number }): string {
  const { period } = timeContext;
  
  // Late night - add urgency
  if (period === 'late') {
    return message
      .replace("Solid next stop", "Perfect next move")
      .replace("Easy move to keep it going.", "Keep the momentum going.")
      .replace("Love this next spot.", "You have to hit this next.");
  }
  
  // After hours - acknowledge the hour
  if (period === 'after_hours') {
    return message
      .replace("Solid next stop to keep the night going.", "Still going? This spot is open.")
      .replace("Easy move to keep it going.", "Still open. Let's keep it going.")
      .replace("A refined continuation of the evening.", "For those extending the evening.");
  }
  
  return message;
}
