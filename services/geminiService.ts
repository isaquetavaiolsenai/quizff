import { GoogleGenAI, Type } from "@google/genai";
import { StoryNode, DifficultyLevel, GameMode } from "../types.ts";

const DEFAULT_TOPICS = [
  "Curiosidades de Free Fire",
  "Estratégias de Battle Royale",
  "História dos Games",
  "Cultura Pop e Anime"
];

export const generateGameQuestion = async (
  roundNumber: number, 
  difficulty: DifficultyLevel = 'Médio',
  gameMode: GameMode = 'Quiz',
  customTopic: string | null = null
): Promise<{ node: StoryNode, imageUrl: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const isCustom = !!customTopic && customTopic.trim().length > 0;
  const activeTopic = isCustom ? customTopic.trim() : DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
  const isTF = gameMode === 'TrueFalse';

  const prompt = `Gere uma pergunta de quiz desafiadora sobre o tema: "${activeTopic}".
    Dificuldade: ${difficulty}.
    Modo: ${isTF ? 'Verdadeiro ou Falso' : 'Múltipla Escolha'}.
    Se for Verdadeiro ou Falso, as opções DEVEM ser exatamente ["VERDADEIRO", "FALSO"].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING, 
              description: "A pergunta a ser feita ao jogador." 
            },
            choices: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: isTF ? "Sempre ['VERDADEIRO', 'FALSO']" : "4 opções de resposta únicas."
            },
            correctAnswerIndex: { 
              type: Type.INTEGER, 
              description: "Índice de 0 a 3 da resposta correta." 
            }
          },
          required: ["text", "choices", "correctAnswerIndex"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const questionNode: StoryNode = JSON.parse(text);

    // Sanitização para garantir compatibilidade com modos de jogo
    if (isTF) {
      questionNode.choices = ["VERDADEIRO", "FALSO"];
      if (questionNode.correctAnswerIndex > 1) questionNode.correctAnswerIndex = 0;
    }

    return { node: questionNode, imageUrl: '' };

  } catch (err: any) {
    console.error("Gemini SDK Error:", err);
    // Fallback amigável em caso de erro
    return {
      node: {
        text: `Qual destes itens é essencial no Free Fire? (IA offline: ${err.message})`,
        choices: ["KIT MÉDICO", "GELO", "MUNIÇÃO", "COLETE"],
        correctAnswerIndex: 1
      },
      imageUrl: ''
    };
  }
};