
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Item } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const expandCategoryItems = async (categoryName: string, existingItems: Item[]): Promise<Item[]> => {
  const ai = getAI();
  const existingNames = existingItems.map(i => i.name).join(", ");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 10 new English vocabulary items for children in the category "${categoryName}".
    Avoid: [${existingNames}].
    Return ONLY a raw JSON array: [{"name": "English", "persianName": "Farsi", "emoji": "🍎"}].`,
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
  });

  const text = response.text || "[]";
  const data = JSON.parse(text);
  
  return data.map((it: any, index: number) => ({
    id: `dyn-${categoryName}-${Date.now()}-${index}`,
    name: it.name,
    persianName: it.persianName,
    emoji: it.emoji,
    color: "bg-white"
  }));
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
      }
    }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateItemImage = async (itemName: string): Promise<string | undefined> => {
  const ai = getAI();
  try {
    // استفاده از مدل Flash Image که محدودیت‌های Pro را ندارد
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A vibrant 3D Disney style character of a ${itemName}, clean white background, high quality 3D render, cute and cheerful.` }]
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
  } catch (e) {
    console.error("Flash Image Gen failed", e);
    throw e;
  }
  return undefined;
};
