import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ChatContext {
  userMessage: string;
  city: string;
  preferences?: any;
  availableVenues?: any[];
}

export async function getChatResponse(context: ChatContext): Promise<string> {
  const systemPrompt = `You are Lumina, a sophisticated nightlife concierge AI for NYC metro area.

CRITICAL RULES:
1. NEVER hallucinate or make up venue names
2. Be conversational and warm
3. Keep responses concise (2-3 sentences)
4. Be encouraging about their plans

Current context:
- City: ${context.city}
- Venues available: ${context.availableVenues?.length || 0}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: context.userMessage,
        },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    return textContent ? (textContent as any).text : 'I found some great spots for you!';
    
  } catch (error) {
    console.error('Claude API error:', error);
    return `I found ${context.availableVenues?.length || 0} perfect spots for you!`;
  }
}
