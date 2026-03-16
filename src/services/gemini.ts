import { GoogleGenAI, Type } from "@google/genai";

export const generateAuctionDescription = async (title: string, category: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI description unavailable (API key missing).";
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a compelling, professional auction description for an item titled "${title}" in the category of "${category}". Keep it under 100 words.`,
    });
    
    return response.text || "Failed to generate description.";
  } catch (error) {
    console.error("Gemini description error:", error);
    return "Failed to generate AI description. Please try again later.";
  }
};

export const getSmartBidSuggestion = async (currentBid: number, minBid: number) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [currentBid + 5, currentBid + 10, currentBid + 25];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on a current highest bid of $${currentBid} and a starting minimum bid of $${minBid}, suggest 3 competitive next bid values as a JSON array of numbers.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER }
        }
      }
    });

    const suggestions = JSON.parse(response.text);
    return suggestions;
  } catch (e) {
    console.error("Gemini suggestion error:", e);
    return [currentBid + 5, currentBid + 10, currentBid + 25];
  }
};
