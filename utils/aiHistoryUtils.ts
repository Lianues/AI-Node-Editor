
import { GeminiHistoryItem, OpenAIMessageForHistory, GeminiPart } from '../types';

/**
 * Parses a JSON string into a chat history array.
 * Returns null if parsing fails or the result is not an array.
 */
export function parseHistoryInput(jsonString?: string): GeminiHistoryItem[] | OpenAIMessageForHistory[] | null {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      // Basic validation can be added here to check if items have 'role'
      if (parsed.length > 0 && typeof parsed[0].role !== 'string') {
        console.warn("Parsed history item missing 'role'. Assuming invalid format.");
        return null;
      }
      return parsed as GeminiHistoryItem[] | OpenAIMessageForHistory[];
    }
    return null;
  } catch (error) {
    console.error("Failed to parse history JSON:", error);
    return null;
  }
}

/**
 * Type guard to check if a history array is in Gemini format.
 */
export function isGeminiHistory(history: any[]): history is GeminiHistoryItem[] {
  if (!history || history.length === 0) {
    return false; // Or true if empty array is considered valid Gemini history for some contexts
  }
  const firstItem = history[0];
  return (
    typeof firstItem.role === 'string' &&
    Array.isArray(firstItem.parts) &&
    (firstItem.parts.length === 0 || (typeof firstItem.parts[0] === 'object' && firstItem.parts[0] !== null && 'text' in firstItem.parts[0]))
  );
}

/**
 * Type guard to check if a history array is in OpenAI format.
 */
export function isOpenAIHistory(history: any[]): history is OpenAIMessageForHistory[] {
  if (!history || history.length === 0) {
    return false; // Or true if empty array is valid
  }
  const firstItem = history[0];
  return (
    typeof firstItem.role === 'string' &&
    // OpenAI messages typically have a 'content' field, though it can be null for some roles like tool calls.
    // For basic text chat history, we expect 'content'.
    (typeof firstItem.content === 'string' || firstItem.content === null) &&
    firstItem.parts === undefined // Gemini has 'parts', OpenAI doesn't for basic messages
  );
}

/**
 * Converts OpenAI chat history to Gemini format.
 * System messages are ignored as Gemini uses a separate systemInstruction field.
 */
export function convertToGeminiFormat(openAIHistory: OpenAIMessageForHistory[]): GeminiHistoryItem[] {
  const geminiHistory: GeminiHistoryItem[] = [];
  for (const message of openAIHistory) {
    if (message.role === 'user') {
      geminiHistory.push({ role: 'user', parts: [{ text: message.content || "" }] });
    } else if (message.role === 'assistant') {
      geminiHistory.push({ role: 'model', parts: [{ text: message.content || "" }] });
    }
    // System messages are intentionally ignored here.
  }
  return geminiHistory;
}

/**
 * Converts Gemini chat history to OpenAI format.
 */
export function convertToOpenAIFormat(geminiHistory: GeminiHistoryItem[]): OpenAIMessageForHistory[] {
  const openAIHistory: OpenAIMessageForHistory[] = [];
  for (const item of geminiHistory) {
    // Assuming parts always has at least one item and we take the text from the first part.
    // More complex Gemini parts (like images) are not handled here.
    const content = item.parts?.[0]?.text || "";
    if (item.role === 'user') {
      openAIHistory.push({ role: 'user', content });
    } else if (item.role === 'model') {
      openAIHistory.push({ role: 'assistant', content });
    }
  }
  return openAIHistory;
}
