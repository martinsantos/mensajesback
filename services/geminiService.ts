import { GoogleGenAI } from "@google/genai";

// Safe initialization checking
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateHeadline = async (content: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing");
    return "AI Unavailable: Configure API Key";
  }

  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a punchy, journalistic headline (max 10 words) for the following article content. Do not use quotes. Language: Spanish. Content: ${content.substring(0, 500)}`,
    });
    return response.text || "Error generating headline";
  } catch (error) {
    console.error("Gemini Headline Error:", error);
    return "Error generating headline";
  }
};

export const suggestCoverLayout = async (articles: any[]): Promise<string[]> => {
  if (!ai) return [];

  try {
    const articleSummaries = articles.map(a => `- ID: ${a.id}, Title: ${a.title}, Category: ${a.category}`).join('\n');
    
    const prompt = `
      You are a newspaper editor. Given the following list of articles, select the best 4 articles for the front page based on newsworthiness and variety.
      Return ONLY a JSON array of the 4 Article IDs strings.
      
      Articles:
      ${articleSummaries}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const jsonStr = response.text;
    if (!jsonStr) return [];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Layout Error:", error);
    return [];
  }
};
