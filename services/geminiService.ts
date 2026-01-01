
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Item } from "../types";

const ttsCache = new Map<string, string>();

/**
 * Enhanced fetchWithRetry to handle Gemini Free Tier limits.
 * Uses exponential backoff with jitter and specifically handles 429 (Rate Limit) 
 * and 500 (Internal Server) errors.
 */
const fetchWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || (error.message?.includes('429') ? 429 : error.message?.includes('500') ? 500 : 0);
    const isRateLimit = status === 429;
    const isInternalError = status === 500;
    
    if (retries > 0 && (isRateLimit || isInternalError)) {
      // For 429 in interactive UI, we retry less to allow faster fallback
      const jitter = Math.random() * 500;
      const waitTime = delay + jitter;
      
      console.warn(`Gemini API ${status} error. Retrying in ${Math.round(waitTime)}ms... (${retries} attempts left)`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getFunFact = async (itemName: string, category: string): Promise<string> => {
  if (!process.env.API_KEY) return "You are amazing!";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Short, fun fact about ${itemName} for a 5-year-old in simple English. 10 words max.`,
      config: { maxOutputTokens: 40 }
    }));
    return response.text || `The ${itemName} is cool!`;
  } catch (error) { 
    console.error("Gemini text call failed:", error);
    return "Keep exploring!"; 
  }
};

export const expandCategoryItems = async (categoryName: string, existingItems: Item[]): Promise<Item[]> => {
  if (!process.env.API_KEY) return [];
  const existingNames = existingItems.map(i => i.name).join(", ");
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 10 new unique educational items for the category "${categoryName}" for kids. 
      The current items are: [${existingNames}]. DO NOT repeat these.
      Find more advanced or specific examples to keep it interesting.
      Return a JSON array of objects with keys: name (English), persianName (Farsi), emoji.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              persianName: { type: Type.STRING },
              emoji: { type: Type.STRING }
            },
            required: ["name", "persianName", "emoji"]
          }
        }
      }
    }));

    const text = response.text || "[]";
    const newItemsRaw = JSON.parse(text);
    return newItemsRaw.map((it: any, index: number) => ({
      id: `dynamic-${categoryName}-${Date.now()}-${index}`,
      name: it.name,
      persianName: it.persianName,
      emoji: it.emoji,
      color: "bg-white"
    }));
  } catch (error) {
    console.error("Expansion failed", error);
    return [];
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  if (!process.env.API_KEY) return undefined;
  if (ttsCache.has(text)) return ttsCache.get(text);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Say clearly for a child learning English: ${text}`;
    
    // Low retry count for TTS to prevent UI lag on 429
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Kore' } 
          } 
        }
      }
    }), 1, 500);
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      ttsCache.set(text, audioData);
      return audioData;
    }
    return undefined;
  } catch (error: any) { 
    // Just return undefined, App.tsx will handle the fallback
    return undefined; 
  }
};

export const generateItemImage = async (itemName: string, categoryName: string): Promise<string | undefined> => {
  if (!process.env.API_KEY) return undefined;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A highly detailed, colorful, and cheerful 3D style illustration of a ${itemName} for a children's learning app. Set in the context of ${categoryName}. Studio lighting, clean white background, vibrant colors, friendly appearance. No text in image.`;
    
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    }));

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation failed", error);
    return undefined;
  }
};
