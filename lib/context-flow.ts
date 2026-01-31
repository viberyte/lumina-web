/**
 * Context Flow Handler
 * Manages contextual questions based on user's "who" selection
 */

import { getNextContextQuestion } from './context-questions';

export function handleContextualFlow(
  selection: string,
  type: string,
  currentFlow: any,
  setFlow: (flow: any) => void,
  setMessages: (fn: (msgs: any[]) => any[]) => void
): boolean {
  const newFlow = { ...currentFlow };
  newFlow[type] = selection;
  
  // Add user message
  setMessages(prev => [...prev, { role: 'user', content: selection }]);
  
  // If this is "who" selection, check for contextual questions
  if (type === 'who') {
    const contextQ = getNextContextQuestion(selection, newFlow);
    
    if (contextQ) {
      newFlow.step = 'context';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: contextQ.question,
        showButtons: true,
        buttonType: 'context',
        contextKey: contextQ.key,
        options: contextQ.options
      }]);
      setFlow(newFlow);
      return true; // Stop here, wait for context answer
    }
  }
  
  // If this is a context answer, check for more context questions
  if (type === 'context') {
    const contextKey = (currentFlow as any).currentContextKey;
    if (contextKey) {
      newFlow[contextKey] = selection;
    }
    
    const contextQ = getNextContextQuestion(currentFlow.who, newFlow);
    
    if (contextQ) {
      newFlow.currentContextKey = contextQ.key;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: contextQ.question,
        showButtons: true,
        buttonType: 'context',
        contextKey: contextQ.key,
        options: contextQ.options
      }]);
      setFlow(newFlow);
      return true; // More context questions
    }
  }
  
  setFlow(newFlow);
  return false; // No more context questions, proceed normally
}
