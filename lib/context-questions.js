/**
 * CONTEXTUAL QUESTIONS BASED ON WHO
 */

export const contextQuestions = {
  
  'date': [
    {
      key: 'date_stage',
      question: "Say less 🌹 First date or you two already vibing?",
      options: [
        { value: 'first-date', label: 'First Date' },
        { value: 'dating', label: 'Been Dating' },
        { value: 'anniversary', label: 'Anniversary' }
      ]
    },
    {
      key: 'date_vibe',
      question: "Keep it chill so y'all can talk, or somewhere with activity?",
      options: [
        { value: 'quiet-intimate', label: 'Quiet & Intimate 💬' },
        { value: 'fun-active', label: 'Fun & Active 🎲' }
      ]
    }
  ],
  
  'friends': [
    {
      key: 'energy_level',
      question: "Vibe check - turning up or keeping it lowkey?",
      options: [
        { value: 'turn-up', label: 'Turn Up 🔥' },
        { value: 'chill', label: 'Chill Hangout 😎' }
      ]
    },
    {
      key: 'group_size',
      question: "How many deep?",
      options: [
        { value: 'small', label: '2-4 people' },
        { value: 'medium', label: '5-8 people' },
        { value: 'large', label: '9+ squad' }
      ]
    }
  ],
  
  'business': [
    {
      key: 'business_type',
      question: "Client dinner or team hangout?",
      options: [
        { value: 'client', label: 'Client/Investor 💼' },
        { value: 'team', label: 'Team Outing 👥' }
      ]
    }
  ],
  
  'solo': [
    {
      key: 'solo_purpose',
      question: "What's the vibe for tonight?",
      options: [
        { value: 'work', label: 'Getting Work Done 💻' },
        { value: 'meet-people', label: 'Meet New People 👋' },
        { value: 'treat-myself', label: 'Treat Myself 🍷' },
        { value: 'explore', label: 'Just Exploring 🚶' }
      ]
    }
  ]
};

export function getNextContextQuestion(who, currentFlow) {
  const whoKey = who.toLowerCase().replace(/\s+/g, '-').replace('date-night', 'date').replace('with-', '');
  const questions = contextQuestions[whoKey] || [];
  
  for (const q of questions) {
    if (!currentFlow[q.key]) {
      return q;
    }
  }
  
  return null;
}
