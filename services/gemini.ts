import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are Aether, a highly advanced, futuristic AI personal assistant. 
Your personality is calm, intelligent, and efficient. 
You speak concisely and naturally, suitable for voice interaction.
Do not use markdown formatting (like bold or italics) in your response unless specifically asked, as your output is primarily for voice synthesis.
Keep responses under 3 sentences when in conversation mode, unless explaining a complex topic.
`;

export const generateResponse = async (prompt: string): Promise<string> => {
  if (!apiKey) {
    return "I'm sorry, I don't have an API key configured. Please check your settings.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    
    return response.text || "I didn't catch that.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my neural network right now.";
  }
};

export const generateSuggestions = async (): Promise<string[]> => {
    // Mock suggestions for dashboard, or could be real AI calls
    return [
        "Plan my schedule for tomorrow",
        "Summarize my latest emails",
        "Give me a creative writing prompt",
        "What's the weather looking like?"
    ];
}
