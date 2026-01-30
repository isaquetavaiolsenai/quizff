
import { GoogleGenAI, Type } from "@google/genai";
import { StoryNode, DifficultyLevel, GameMode } from "../types";

const DEFAULT_TOPICS = [
  "Free Fire: Personagens e Habilidades",
  "Free Fire: Mapas e Estratégias",
  "Free Fire: Atributos de Armas",
  "Free Fire: Lore e Curiosidades"
];

export const generateGameQuestion = async (
  roundNumber: number, 
  difficulty: DifficultyLevel = 'Médio',
  gameMode: GameMode = 'Quiz',
  customTopic: string | null = null
): Promise<{ node: StoryNode, imageUrl: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isCustom = !!customTopic && customTopic.trim().length > 0;
  const activeTopic = isCustom ? customTopic.trim() : DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
  const isTF = gameMode === 'TrueFalse';

  let systemInstruction = `Você é um motor de jogo de Quiz inteligente. `;
  if (isCustom) {
    systemInstruction += `O tema atual é: "${activeTopic}". Esqueça Free Fire e foque apenas neste assunto. `;
  } else {
    systemInstruction += `O tema é Free Fire. Use gírias como 'capa', 'rush', 'squad'. `;
  }

  systemInstruction += `
    REGRAS:
    - Nível de dificuldade: ${difficulty}.
    - Responda apenas em JSON válido.
    - Se modo Verdadeiro/Falso, escolhas devem ser ["VERDADEIRO", "FALSO"].
  `;

  try {
    // 1. Gerar Pergunta (Texto)
    const textRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma pergunta de ${isTF ? 'Verdadeiro ou Falso' : 'múltipla escolha (4 opções)'} sobre: ${activeTopic}.`,
      config: {
        systemInstruction,
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

    const data = JSON.parse(textRes.text || '{}');
    if (isTF) data.choices = ["VERDADEIRO", "FALSO"];

    // 2. Gerar Imagem (Opcional - tenta mas não trava se falhar)
    let imageUrl = '';
    try {
      const imgRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Arte vibrante de quiz sobre ${activeTopic}: ${data.text}`,
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      const part = imgRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) imageUrl = `data:image/png;base64,${part.inlineData.data}`;
    } catch (e) {
      console.warn("Imagem não gerada devido a quota.");
    }

    return { node: data, imageUrl };

  } catch (err: any) {
    console.error("Gemini Error:", err);
    const isQuota = err?.message?.includes('429');
    return {
      node: {
        text: isQuota 
          ? `[LIMITE ATINGIDO] Aguarde um instante para a próxima pergunta sobre ${activeTopic}.` 
          : `Erro ao gerar pergunta sobre ${activeTopic}. Quer tentar de novo?`,
        choices: ["TENTAR NOVAMENTE", "MUDAR TEMA", "SAIR", "AGUARDAR"],
        correctAnswerIndex: 0
      },
      imageUrl: ''
    };
  }
};
