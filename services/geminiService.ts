
import { GoogleGenAI, Type } from "@google/genai";
import { StoryNode, DifficultyLevel } from "../types";

const SYSTEM_PROMPT = `VOCÊ É O MESTRE SUPREMO DO QUIZ FREE FIRE (ESTILO COMPETITIVO).
Sua missão é gerar desafios táticos para jogadores de elite. 
As perguntas devem abranger: habilidades de personagens, mecânicas de armas (recuo, cadência), estratégias de rotação nos mapas (Bermuda, Purgatório, Kalahari), estatísticas de eSports e curiosidades do meta atual.

REGRAS:
1. Sempre forneça EXATAMENTE 4 opções de resposta.
2. Seja técnico e use gírias do jogo (ex: "dar capa", "rushar", "looteando").
3. Retorne APENAS o JSON puro.

JSON SCHEMA: { "text": "Pergunta técnica", "choices": ["A", "B", "C", "D"], "correctAnswerIndex": 0-3 }`;

export const generateGameQuestion = async (
  roundNumber: number, 
  difficulty: DifficultyLevel = 'Médio'
): Promise<{ node: StoryNode, imageUrl: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const difficultyContext = {
    'Fácil': 'Conhecimentos básicos de iniciante (Ex: "Qual personagem tem habilidade de cura passiva?")',
    'Médio': 'Mecânicas intermediárias e mapas (Ex: "Qual arma usa munição de SMG e tem mira 4x acoplada?")',
    'Difícil': 'Táticas de nível Pro-Player e estatísticas (Ex: "Quanto de dano por segundo causa o gás da 4ª zona?")'
  };

  const prompt = `Rodada ${roundNumber} - Dificuldade ${difficulty}: Gere uma pergunta de Free Fire sobre ${difficultyContext[difficulty]}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            choices: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER }
          },
          required: ["text", "choices", "correctAnswerIndex"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');

    // Geração de Imagem Temática
    let imageUrl = '';
    try {
      const imgRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Epic high-resolution eSports digital art, Free Fire theme, hyper-realistic, action-packed lighting, relating to: ${data.text}. Cinematic composition.`,
        config: {
          imageConfig: { aspectRatio: "16:9" }
        }
      });

      if (imgRes.candidates?.[0]?.content?.parts) {
        for (const part of imgRes.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Imagem não gerada, usando fallback.");
    }

    return { node: data, imageUrl };
  } catch (err) {
    console.error("Erro Gemini:", err);
    throw err;
  }
};
